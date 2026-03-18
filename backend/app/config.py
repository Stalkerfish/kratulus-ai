from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import os


@dataclass(frozen=True)
class Settings:
    """Application configuration loaded from environment variables."""

    app_name: str = "Kratulus OCR Backend"
    app_version: str = "0.1.0"
    environment: str = "development"
    ocr_provider: str = "myscript"
    myscript_api_url: str = "https://cloud.myscript.com/api/v4.0/iink/batch"
    myscript_application_key: str | None = None
    myscript_hmac_key: str | None = None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("APP_NAME", Settings.app_name),
        app_version=os.getenv("APP_VERSION", Settings.app_version),
        environment=os.getenv("ENVIRONMENT", Settings.environment),
        ocr_provider=os.getenv("OCR_PROVIDER", Settings.ocr_provider),
        myscript_api_url=os.getenv("MYSCRIPT_API_URL", Settings.myscript_api_url),
        myscript_application_key=os.getenv("MYSCRIPT_APPLICATION_KEY") or None,
        myscript_hmac_key=os.getenv("MYSCRIPT_HMAC_KEY") or None,
    )
