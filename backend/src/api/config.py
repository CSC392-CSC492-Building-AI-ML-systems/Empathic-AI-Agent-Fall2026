from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SAM"
    hf_token: str = ""
    openai_api_key: str = ""
    decision_model: str = "gpt-6-luna"
    postgres_user: str | None = None
    database_url: str | None = None
    cors_origins: list[str] = [
        "http://localhost",
        "http://localhost:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://sam-the-empathetic-ai.vercel.app"
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
