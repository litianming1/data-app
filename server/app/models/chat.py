from typing import Literal

from pydantic import BaseModel, Field


class ConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    conversation_id: str | None = None
    mode: str = "fast"


class ChatResponse(BaseModel):
    conversation_id: str | None = None
    mode: str
    reply: str