from unittest import IsolatedAsyncioTestCase

from app.services.conversation_store import ConversationStore


class FakeCursor:
    def __init__(self) -> None:
        self.length: int | None = None

    def sort(self, *_args):
        return self

    def limit(self, *_args):
        return self

    async def to_list(self, length=None):
        self.length = length
        return []


class FakeCollection:
    def __init__(self) -> None:
        self.aggregate_pipeline = None
        self.find_query = None
        self.find_one_query = None
        self.insert_many_documents = None

    def aggregate(self, pipeline):
        self.aggregate_pipeline = pipeline
        return FakeCursor()

    def find(self, query, *_args):
        self.find_query = query
        return FakeCursor()

    async def find_one(self, query, *_args):
        self.find_one_query = query
        return None

    async def insert_many(self, documents):
        self.insert_many_documents = documents


class FakeDatabase:
    def __init__(self) -> None:
        self.collection = FakeCollection()

    def __getitem__(self, _name: str):
        return self.collection


class ConversationStoreUserIsolationTest(IsolatedAsyncioTestCase):
    async def test_list_conversations_filters_by_user_id(self) -> None:
        database = FakeDatabase()
        store = ConversationStore(database)

        await store.list_conversations(user_id="user-1")

        self.assertEqual(database.collection.aggregate_pipeline[0], {"$match": {"user_id": "user-1"}})

    async def test_history_and_existence_filter_by_user_id(self) -> None:
        database = FakeDatabase()
        store = ConversationStore(database)

        await store.get_history("conversation-1", user_id="user-1")
        await store.conversation_exists("conversation-1", user_id="user-1")

        self.assertEqual(
            database.collection.find_query,
            {"conversation_id": "conversation-1", "user_id": "user-1"},
        )
        self.assertEqual(
            database.collection.find_one_query,
            {"conversation_id": "conversation-1", "user_id": "user-1"},
        )

    async def test_append_exchange_writes_user_id_to_each_message(self) -> None:
        database = FakeDatabase()
        store = ConversationStore(database)

        await store.append_exchange(
            "conversation-1",
            user_message="hello",
            assistant_message="hi",
            user_id="user-1",
        )

        self.assertEqual(
            [document["user_id"] for document in database.collection.insert_many_documents],
            ["user-1", "user-1"],
        )
