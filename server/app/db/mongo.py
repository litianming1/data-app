from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import Settings


def create_mongo_client(settings: Settings) -> AsyncIOMotorClient:
    return AsyncIOMotorClient(settings.mongodb_uri)


def get_mongo_database(
    client: AsyncIOMotorClient, settings: Settings
) -> AsyncIOMotorDatabase:
    return client[settings.mongodb_database]