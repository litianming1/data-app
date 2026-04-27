import asyncpg

from app.core.config import Settings


async def create_postgres_pool(settings: Settings) -> asyncpg.Pool:
    return await asyncpg.create_pool(dsn=settings.postgres_dsn)