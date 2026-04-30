from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.agents.chat_graph import build_chat_graph
from app.api.routes import router
from app.core.config import get_settings
from app.db.mongo import create_mongo_client, get_mongo_database
from app.services.conversation_store import ConversationStore
from app.services.auth_service import AuthService
from app.services.deepseek import DeepSeekService
from app.services.skill_store import SkillStore
from app.services.user_store import UserStore


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    app.state.settings = settings
    app.state.mongo_client = create_mongo_client(settings)
    app.state.mongo_db = get_mongo_database(app.state.mongo_client, settings)
    app.state.postgres_pool = None
    app.state.conversation_store = ConversationStore(app.state.mongo_db)
    await app.state.conversation_store.ensure_indexes()
    app.state.auth_service = AuthService(
        secret_key=settings.auth_secret_key,
        token_expire_minutes=settings.auth_token_expire_minutes,
    )
    app.state.user_store = UserStore(app.state.mongo_db)
    await app.state.user_store.ensure_indexes()
    await app.state.user_store.seed_admin(
        settings.admin_email, settings.admin_password, app.state.auth_service
    )
    app.state.skill_store = SkillStore(app.state.mongo_db)
    await app.state.skill_store.ensure_indexes()
    await app.state.skill_store.seed_defaults()
    app.state.deepseek_service = DeepSeekService(settings)
    app.state.chat_graph = build_chat_graph(app.state.deepseek_service)

    try:
        yield
    finally:
        app.state.mongo_client.close()
        if app.state.postgres_pool is not None:
            await app.state.postgres_pool.close()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router, prefix="/api")
    return app


app = create_app()