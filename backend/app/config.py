from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    postgres_db: str = "accessible_ai_campus"
    postgres_user: str = "campus_user"
    postgres_password: str
    postgres_host: str = "localhost"
    postgres_port: int = 5432


settings = Settings()