from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ConversationSummary(BaseModel):
    conversation_id: str
    title: str
    preview: str
    message_count: int
    created_at: datetime
    updated_at: datetime


class ConversationHistoryResponse(BaseModel):
    conversation_id: str
    messages: list[ConversationMessage]


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    conversation_id: str | None = None
    mode: str = "fast"


class TriggeredSkill(BaseModel):
    category: str
    id: str
    name: str
    trigger: str


class ChatResponse(BaseModel):
    conversation_id: str | None = None
    mode: str
    reply: str
    triggered_skills: list[TriggeredSkill] = []