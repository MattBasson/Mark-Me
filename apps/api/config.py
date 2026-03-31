from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    anthropic_api_key: str = "sk-ant-placeholder"
    cors_origins: list[str] = ["http://localhost:3000"]
    upload_dir: Path = BASE_DIR / "data" / "uploads"
    processed_dir: Path = BASE_DIR / "data" / "processed"
    export_dir: Path = BASE_DIR / "data" / "exports"
    db_path: Path = BASE_DIR / "db" / "mark_me.db"
    low_confidence_threshold: float = 0.65
    min_page_quality: float = 0.4

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

# Ensure data directories exist at import time so StaticFiles can mount them
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.processed_dir.mkdir(parents=True, exist_ok=True)
settings.export_dir.mkdir(parents=True, exist_ok=True)
settings.db_path.parent.mkdir(parents=True, exist_ok=True)
