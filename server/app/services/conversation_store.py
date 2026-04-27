from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.chat import ConversationMessage


MessageRole = Literal["user", "assistant"]


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