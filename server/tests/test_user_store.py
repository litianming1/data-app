from datetime import UTC, datetime
from unittest import IsolatedAsyncioTestCase

from app.models.auth import UserCreate, UserUpdate
from app.services.auth_service import AuthService
from app.services.user_store import UserStore


class FakeCursor:
    def __init__(self, documents: list[dict[str, object]]) -> None:
        self.documents = documents

    def sort(self, *_args):
        return self

    async def to_list(self, length=None):
        return self.documents


class FakeResult:
    def __init__(self, deleted_count: int = 0) -> None:
        self.deleted_count = deleted_count


class FakeCollection:
    def __init__(self) -> None:
        self.documents: list[dict[str, object]] = []

    async def create_index(self, *_args, **_kwargs):
        return None

    async def find_one(self, query, *_args):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                return dict(document)
        return None

    async def insert_one(self, document):
        self.documents.append(dict(document))

    def find(self, *_args):
        return FakeCursor([dict(document) for document in self.documents])

    async def update_one(self, query, update):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                document.update(update.get("$set", {}))
                break

    async def delete_one(self, query):
        before = len(self.documents)
        self.documents = [
            document
            for document in self.documents
            if not all(document.get(key) == value for key, value in query.items())
        ]
        return FakeResult(deleted_count=before - len(self.documents))


class FakeDatabase:
    def __init__(self) -> None:
        self.collection = FakeCollection()

    def __getitem__(self, _name: str):
        return self.collection


class UserStoreManagementTest(IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.database = FakeDatabase()
        self.store = UserStore(self.database)
        self.auth_service = AuthService("test-secret", 15)

    async def test_create_user_hashes_password_and_returns_safe_user(self) -> None:
        user = await self.store.create_user(
            UserCreate(
                email="Team@Example.com",
                name="Team Member",
                password="secret-password",
                role="user",
            ),
            self.auth_service,
        )

        document = self.database.collection.documents[0]
        self.assertEqual(user.email, "team@example.com")
        self.assertEqual(user.name, "Team Member")
        self.assertEqual(user.role, "user")
        self.assertNotEqual(document["password_hash"], "secret-password")
        self.assertTrue(
            self.auth_service.verify_password("secret-password", document["password_hash"])
        )

    async def test_list_update_and_delete_users(self) -> None:
        now = datetime.now(UTC)
        self.database.collection.documents.append(
            {
                "created_at": now,
                "email": "old@example.com",
                "id": "user-1",
                "name": "Old Name",
                "password_hash": "hash",
                "role": "user",
                "updated_at": now,
            }
        )

        users = await self.store.list_users()
        updated = await self.store.update_user(
            "user-1", UserUpdate(name="New Name", role="admin")
        )
        deleted = await self.store.delete_user("user-1")

        self.assertEqual(len(users), 1)
        self.assertEqual(updated.name, "New Name")
        self.assertEqual(updated.role, "admin")
        self.assertTrue(deleted)
