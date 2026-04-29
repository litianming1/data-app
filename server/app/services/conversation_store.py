from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.chat import ConversationMessage, ConversationSummary


MessageRole = Literal["user", "assistant"]


def _truncate_text(text: str, limit: int = 40) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[: limit - 1]}…"


class ConversationStore:
    """MongoDB-backed conversation history store."""

    def __init__(self, database: AsyncIOMotorDatabase, history_limit: int = 20) -> None:
        self.collection = database["chat_messages"]
        self.history_limit = history_limit

    async def ensure_indexes(self) -> None:
        await self.collection.create_index(
            [("conversation_id", 1), ("created_at", 1), ("_id", 1)]
        )

    @staticmethod
    def ensure_conversation_id(conversation_id: str | None) -> str:
        if conversation_id:
            return conversation_id
        return str(uuid4())

    async def get_history(self, conversation_id: str) -> list[ConversationMessage]:
        cursor = (
            self.collection.find(
                {"conversation_id": conversation_id},
                {"_id": 0, "role": 1, "content": 1},
            )
            .sort([("created_at", -1), ("_id", -1)])
            .limit(self.history_limit)
        )
        documents = await cursor.to_list(length=self.history_limit)
        return [ConversationMessage(**document) for document in reversed(documents)]

    async def conversation_exists(self, conversation_id: str) -> bool:
        document = await self.collection.find_one(
            {"conversation_id": conversation_id}, {"_id": 1}
        )
        return document is not None

    async def list_conversations(self, limit: int = 20) -> list[ConversationSummary]:
        safe_limit = max(1, min(limit, 100))
        pipeline = [
            {"$sort": {"conversation_id": 1, "created_at": 1, "_id": 1}},
            {
                "$group": {
                    "_id": "$conversation_id",
                    "created_at": {"$first": "$created_at"},
                    "updated_at": {"$last": "$created_at"},
                    "message_count": {"$sum": 1},
                    "messages": {
                        "$push": {"role": "$role", "content": "$content"}
                    },
                }
            },
            {"$sort": {"updated_at": -1}},
            {"$limit": safe_limit},
        ]
        documents = await self.collection.aggregate(pipeline).to_list(length=safe_limit)

        summaries: list[ConversationSummary] = []
        for document in documents:
            messages = document.get("messages", [])
            first_user_message = next(
                (
                    message["content"]
                    for message in messages
                    if message.get("role") == "user" and message.get("content")
                ),
                None,
            )
            first_message = messages[0]["content"] if messages else "未命名会话"
            last_message = messages[-1]["content"] if messages else first_message
            title_source = first_user_message or first_message

            summaries.append(
                ConversationSummary(
                    conversation_id=document["_id"],
                    title=_truncate_text(title_source),
                    preview=_truncate_text(last_message, limit=80),
                    message_count=document["message_count"],
                    created_at=document["created_at"],
                    updated_at=document["updated_at"],
                )
            )

        return summaries

    async def append_message(
        self, conversation_id: str, role: MessageRole, content: str
    ) -> None:
        await self.collection.insert_one(
            {
                "conversation_id": conversation_id,
                "role": role,
                "content": content,
                "created_at": datetime.now(UTC),
            }
        )

    async def append_exchange(
        self, conversation_id: str, user_message: str, assistant_message: str
    ) -> None:
        now = datetime.now(UTC)
        await self.collection.insert_many(
            [
                {
                    "conversation_id": conversation_id,
                    "role": "user",
                    "content": user_message,
                    "created_at": now,
                },
                {
                    "conversation_id": conversation_id,
                    "role": "assistant",
                    "content": assistant_message,
                    "created_at": now,
                },
            ]
        )