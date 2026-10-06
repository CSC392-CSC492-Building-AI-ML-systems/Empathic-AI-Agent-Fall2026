from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    app_name: str="clarifai"
    postgres_user: Optional[str] = None
    database_url: Optional[str] = None
    redis_url: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
        )
