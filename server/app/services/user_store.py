from datetime import UTC, datetime
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.auth import AuthUser, UserCreate, UserItem, UserRole, UserUpdate
from app.services.auth_service import AuthService


def _normalize_role(role: object) -> UserRole:
    return "admin" if role == "admin" else "user"


def _format_datetime(value: object) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


class UserStore:
    """MongoDB-backed local user account store."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.collection = database["users"]

    async def ensure_indexes(self) -> None:
        await self.collection.create_index("id", unique=True)
        await self.collection.create_index("email", unique=True)

    async def seed_admin(
        self, email: str, password: str, auth_service: AuthService
    ) -> None:
        normalized_email = self.normalize_email(email)
        if not normalized_email or not password:
            return

        if await self.collection.find_one({"email": normalized_email}, {"_id": 1}):
            return

        now = datetime.now(UTC)
        await self.collection.insert_one(
            {
                "created_at": now,
                "email": normalized_email,
                "id": str(uuid4()),
                "name": "Administrator",
                "password_hash": auth_service.hash_password(password),
                "role": "admin",
                "updated_at": now,
            }
        )

    async def find_by_email(self, email: str) -> dict[str, object] | None:
        return await self.collection.find_one(
            {"email": self.normalize_email(email)}, {"_id": 0}
        )

    async def find_by_id(self, user_id: str) -> AuthUser | None:
        document = await self.collection.find_one({"id": user_id}, {"_id": 0})
        return self.to_auth_user(document) if document else None

    async def list_users(self) -> list[UserItem]:
        cursor = self.collection.find({}, {"_id": 0, "password_hash": 0}).sort(
            [("created_at", -1), ("email", 1)]
        )
        documents = await cursor.to_list(length=None)
        return [self.to_user_item(document) for document in documents]

    async def create_user(
        self, payload: UserCreate, auth_service: AuthService
    ) -> UserItem:
        now = datetime.now(UTC)
        document = {
            "created_at": now,
            "email": self.normalize_email(payload.email),
            "id": str(uuid4()),
            "name": payload.name.strip(),
            "password_hash": auth_service.hash_password(payload.password),
            "role": payload.role,
            "updated_at": now,
        }
        await self.collection.insert_one(document)
        return self.to_user_item(document)

    async def update_user(
        self,
        user_id: str,
        payload: UserUpdate,
        auth_service: AuthService | None = None,
    ) -> UserItem | None:
        changes = payload.model_dump(exclude_none=True, exclude_unset=True)
        password = changes.pop("password", None)
        if password is not None:
            if auth_service is None:
                raise ValueError("auth_service is required to update password")
            changes["password_hash"] = auth_service.hash_password(str(password))

        if "name" in changes:
            changes["name"] = str(changes["name"]).strip()

        if changes:
            changes["updated_at"] = datetime.now(UTC)
            await self.collection.update_one({"id": user_id}, {"$set": changes})

        document = await self.collection.find_one({"id": user_id}, {"_id": 0})
        return self.to_user_item(document) if document else None

    async def delete_user(self, user_id: str) -> bool:
        result = await self.collection.delete_one({"id": user_id})
        return result.deleted_count > 0

    @staticmethod
    def normalize_email(email: str) -> str:
        return email.strip().lower()

    @staticmethod
    def to_auth_user(document: dict[str, object]) -> AuthUser:
        return AuthUser(
            email=str(document["email"]),
            id=str(document["id"]),
            name=str(document.get("name") or document["email"]),
            role=_normalize_role(document.get("role")),
        )

    @staticmethod
    def to_user_item(document: dict[str, object]) -> UserItem:
        return UserItem(
            created_at=_format_datetime(document.get("created_at", "")),
            email=str(document["email"]),
            id=str(document["id"]),
            name=str(document.get("name") or document["email"]),
            role=_normalize_role(document.get("role")),
            updated_at=_format_datetime(document.get("updated_at", "")),
        )