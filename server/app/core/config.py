from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from the repository-level .env file."""

    app_name: str = "AI App API"
    api_cors_origins: str = "http://localhost:3000,http://172.27.32.1:3000"

    deepseek_api_key: str = ""
    deepseek_model: str = "deepseek-chat"
    deepseek_base_url: str = "https://api.deepseek.com"

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "ai_app"
    postgres_dsn: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/ai_app"
    )

    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.api_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()