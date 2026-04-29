import json

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from pymongo.errors import DuplicateKeyError

from app.models.chat import (
    ChatRequest,
    ChatResponse,
    ConversationHistoryResponse,
    ConversationSummary,
    TriggeredSkill,
)
from app.models.markitdown import MarkItDownResponse
from app.models.skill import SkillCreate, SkillItem, SkillUpdate
from app.services.markitdown_converter import (
    MarkItDownConversionError,
    convert_upload_to_markdown,
)
from app.services.skill_matcher import match_skills

router = APIRouter()


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


@router.post("/markitdown", response_model=MarkItDownResponse)
async def convert_markitdown(file: UploadFile = File(...)) -> MarkItDownResponse:
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
async def list_skills(request: Request) -> list[SkillItem]:
    skill_store = request.app.state.skill_store
    return await skill_store.list_skills()


@router.get("/conversations", response_model=list[ConversationSummary])
async def list_conversations(request: Request, limit: int = 20) -> list[ConversationSummary]:
    conversation_store = request.app.state.conversation_store
    return await conversation_store.list_conversations(limit=limit)


@router.get(
    "/conversations/{conversation_id}", response_model=ConversationHistoryResponse
)
async def get_conversation(
    conversation_id: str, request: Request
) -> ConversationHistoryResponse:
    conversation_store = request.app.state.conversation_store
    if not await conversation_store.conversation_exists(conversation_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    return ConversationHistoryResponse(
        conversation_id=conversation_id,
        messages=await conversation_store.get_history(conversation_id),
    )


@router.post("/skills", response_model=SkillItem, status_code=status.HTTP_201_CREATED)
async def create_skill(payload: SkillCreate, request: Request) -> SkillItem:
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
    skill_id: str, payload: SkillUpdate, request: Request
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
async def delete_skill(skill_id: str, request: Request) -> None:
    skill_store = request.app.state.skill_store
    deleted = await skill_store.delete_skill(skill_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found.",
        )


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request) -> ChatResponse:
    graph = request.app.state.chat_graph
    conversation_store = request.app.state.conversation_store
    skill_store = request.app.state.skill_store
    conversation_id = conversation_store.ensure_conversation_id(
        payload.conversation_id
    )
    history = await conversation_store.get_history(conversation_id)
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
        conversation_id, payload.message, result["reply"]
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
async def chat_stream(payload: ChatRequest, request: Request) -> StreamingResponse:
    deepseek = request.app.state.deepseek_service
    conversation_store = request.app.state.conversation_store
    skill_store = request.app.state.skill_store
    conversation_id = conversation_store.ensure_conversation_id(
        payload.conversation_id
    )

    async def events():
        reply_parts: list[str] = []
        try:
            history = await conversation_store.get_history(conversation_id)
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
                conversation_id, payload.message, "".join(reply_parts)
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