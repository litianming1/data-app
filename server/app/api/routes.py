import json

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from app.models.chat import ChatRequest, ChatResponse

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request) -> ChatResponse:
    graph = request.app.state.chat_graph
    conversation_store = request.app.state.conversation_store
    conversation_id = conversation_store.ensure_conversation_id(
        payload.conversation_id
    )
    history = await conversation_store.get_history(conversation_id)

    try:
        result = await graph.ainvoke(
            {
                "message": payload.message,
                "mode": payload.mode,
                "history": history,
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
    )


def format_sse(event: str, data: dict[str, str]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/chat/stream")
async def chat_stream(payload: ChatRequest, request: Request) -> StreamingResponse:
    deepseek = request.app.state.deepseek_service
    conversation_store = request.app.state.conversation_store
    conversation_id = conversation_store.ensure_conversation_id(
        payload.conversation_id
    )

    async def events():
        reply_parts: list[str] = []
        try:
            history = await conversation_store.get_history(conversation_id)
            yield format_sse("conversation", {"conversation_id": conversation_id})

            async for text in deepseek.stream(payload.message, payload.mode, history):
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