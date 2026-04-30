import json
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from pymongo.errors import DuplicateKeyError

from app.models.auth import AuthSessionResponse, AuthUser, LoginRequest, UserCreate, UserItem, UserUpdate
from app.models.chat import (
    ChatRequest,
    ChatResponse,
    ConversationHistoryResponse,
    ConversationSummary,
    TriggeredSkill,
)
from app.models.markitdown import MarkItDownResponse
from app.models.skill import SkillCreate, SkillItem, SkillUpdate
from app.services.auth_service import AuthError
from app.services.markitdown_converter import (
    MarkItDownConversionError,
    convert_upload_to_markdown,
)
from app.services.skill_matcher import match_skills

router = APIRouter()


async def get_current_user(request: Request) -> AuthUser:
    settings = request.app.state.settings
    token = request.cookies.get(settings.auth_cookie_name)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )

    try:
        payload = request.app.state.auth_service.decode_access_token(token)
    except AuthError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        ) from error

    user = await request.app.state.user_store.find_by_id(payload.subject)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    return user


CurrentUser = Annotated[AuthUser, Depends(get_current_user)]


async def get_current_admin(current_user: CurrentUser) -> AuthUser:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限。",
        )

    return current_user


AdminUser = Annotated[AuthUser, Depends(get_current_admin)]


def to_triggered_skill(skill: SkillItem) -> TriggeredSkill:
    return TriggeredSkill(
        category=skill.category,
        id=skill.id,
        name=skill.name,
        trigger=skill.trigger,
    )


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/auth/login", response_model=AuthSessionResponse)
async def login(payload: LoginRequest, request: Request, response: Response) -> AuthSessionResponse:
    user_store = request.app.state.user_store
    auth_service = request.app.state.auth_service
    document = await user_store.find_by_email(payload.email)

    if not document or not auth_service.verify_password(
        payload.password, str(document.get("password_hash") or "")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码不正确。",
        )

    user = user_store.to_auth_user(document)
    response.set_cookie(
        key=request.app.state.settings.auth_cookie_name,
        value=auth_service.create_access_token(user.id),
        httponly=True,
        max_age=request.app.state.settings.auth_token_expire_minutes * 60,
        path="/",
        samesite="lax",
        secure=False,
    )
    return AuthSessionResponse(user=user)


@router.get("/auth/me", response_model=AuthSessionResponse)
async def me(current_user: CurrentUser) -> AuthSessionResponse:
    return AuthSessionResponse(user=current_user)


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response) -> None:
    response.delete_cookie(
        key=request.app.state.settings.auth_cookie_name,
        path="/",
        samesite="lax",
        secure=False,
    )


@router.post("/markitdown", response_model=MarkItDownResponse)
async def convert_markitdown(
    _current_user: CurrentUser, file: UploadFile = File(...)
) -> MarkItDownResponse:
    try:
        return await convert_upload_to_markdown(file)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except MarkItDownConversionError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="文件转换失败。",
        ) from error


@router.get("/skills", response_model=list[SkillItem])
async def list_skills(request: Request, _current_user: CurrentUser) -> list[SkillItem]:
    skill_store = request.app.state.skill_store
    return await skill_store.list_skills()


@router.get("/conversations", response_model=list[ConversationSummary])
async def list_conversations(
    request: Request, current_user: CurrentUser, limit: int = 20
) -> list[ConversationSummary]:
    conversation_store = request.app.state.conversation_store
    return await conversation_store.list_conversations(
        user_id=current_user.id, limit=limit
    )


@router.get(
    "/conversations/{conversation_id}", response_model=ConversationHistoryResponse
)
async def get_conversation(
    conversation_id: str, request: Request, current_user: CurrentUser
) -> ConversationHistoryResponse:
    conversation_store = request.app.state.conversation_store
    if not await conversation_store.conversation_exists(
        conversation_id, user_id=current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    return ConversationHistoryResponse(
        conversation_id=conversation_id,
        messages=await conversation_store.get_history(
            conversation_id, user_id=current_user.id
        ),
    )


@router.post("/skills", response_model=SkillItem, status_code=status.HTTP_201_CREATED)
async def create_skill(
    payload: SkillCreate, request: Request, _current_user: CurrentUser
) -> SkillItem:
    skill_store = request.app.state.skill_store
    try:
        return await skill_store.create_skill(payload)
    except DuplicateKeyError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Skill ID already exists.",
        ) from error


@router.patch("/skills/{skill_id}", response_model=SkillItem)
async def update_skill(
    skill_id: str, payload: SkillUpdate, request: Request, _current_user: CurrentUser
) -> SkillItem:
    skill_store = request.app.state.skill_store
    skill = await skill_store.update_skill(skill_id, payload)
    if skill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found.",
        )
    return skill


@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(skill_id: str, request: Request, _current_user: CurrentUser) -> None:
    skill_store = request.app.state.skill_store
    deleted = await skill_store.delete_skill(skill_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found.",
        )


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request, current_user: CurrentUser) -> ChatResponse:
    graph = request.app.state.chat_graph
    conversation_store = request.app.state.conversation_store
    skill_store = request.app.state.skill_store
    conversation_id = conversation_store.ensure_conversation_id(
        payload.conversation_id
    )
    history = await conversation_store.get_history(
        conversation_id, user_id=current_user.id
    )
    enabled_skills = await skill_store.list_enabled_skills()
    triggered_skills = match_skills(payload.message, enabled_skills)

    try:
        result = await graph.ainvoke(
            {
                "message": payload.message,
                "mode": payload.mode,
                "history": history,
                "triggered_skills": triggered_skills,
                "reply": "",
            }
        )
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    await conversation_store.append_exchange(
        conversation_id, payload.message, result["reply"], user_id=current_user.id
    )

    return ChatResponse(
        conversation_id=conversation_id,
        mode=payload.mode,
        reply=result["reply"],
        triggered_skills=[to_triggered_skill(skill) for skill in triggered_skills],
    )


def format_sse(event: str, data: dict[str, object]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/chat/stream")
async def chat_stream(
    payload: ChatRequest, request: Request, current_user: CurrentUser
) -> StreamingResponse:
    deepseek = request.app.state.deepseek_service
    conversation_store = request.app.state.conversation_store
    skill_store = request.app.state.skill_store
    conversation_id = conversation_store.ensure_conversation_id(
        payload.conversation_id
    )

    async def events():
        reply_parts: list[str] = []
        try:
            history = await conversation_store.get_history(
                conversation_id, user_id=current_user.id
            )
            enabled_skills = await skill_store.list_enabled_skills()
            triggered_skills = match_skills(payload.message, enabled_skills)
            yield format_sse("conversation", {"conversation_id": conversation_id})
            yield format_sse(
                "skills",
                {
                    "skills": [
                        to_triggered_skill(skill).model_dump()
                        for skill in triggered_skills
                    ]
                },
            )

            async for text in deepseek.stream(
                payload.message, payload.mode, history, triggered_skills
            ):
                reply_parts.append(text)
                yield format_sse("delta", {"text": text})

            await conversation_store.append_exchange(
                conversation_id,
                payload.message,
                "".join(reply_parts),
                user_id=current_user.id,
            )
            yield format_sse("done", {})
        except RuntimeError as error:
            yield format_sse("error", {"message": str(error)})
        except Exception:
            yield format_sse("error", {"message": "流式生成失败，请稍后再试。"})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/users", response_model=list[UserItem])
async def list_users(request: Request, _admin: AdminUser) -> list[UserItem]:
    return await request.app.state.user_store.list_users()


@router.post("/users", response_model=UserItem, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate, request: Request, _admin: AdminUser
) -> UserItem:
    try:
        return await request.app.state.user_store.create_user(
            payload, request.app.state.auth_service
        )
    except DuplicateKeyError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="用户邮箱已存在。",
        ) from error


@router.patch("/users/{user_id}", response_model=UserItem)
async def update_user(
    user_id: str, payload: UserUpdate, request: Request, admin: AdminUser
) -> UserItem:
    if user_id == admin.id and payload.role is not None and payload.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能移除当前账号的管理员权限。",
        )

    user = await request.app.state.user_store.update_user(
        user_id, payload, request.app.state.auth_service
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, request: Request, admin: AdminUser) -> None:
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除当前登录账号。",
        )

    deleted = await request.app.state.user_store.delete_user(user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )