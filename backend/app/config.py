from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import os


@dataclass(frozen=True)
class Settings:
    """Application configuration loaded from environment variables.

    Defaults are safe for local startup when env vars are not present.
    """

    app_name: str = "Kratulus OCR Backend"
    app_version: str = "0.1.0"
    environment: str = "development"
    ocr_provider: str = "mathpix"
    mathpix_api_url: str = "https://api.mathpix.com/v3/text"
    mathpix_app_id: str | None = None
    mathpix_app_key: str | None = None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("APP_NAME", Settings.app_name),
        app_version=os.getenv("APP_VERSION", Settings.app_version),
        environment=os.getenv("ENVIRONMENT", Settings.environment),
        ocr_provider=os.getenv("OCR_PROVIDER", Settings.ocr_provider),
        mathpix_api_url=os.getenv("MATHPIX_API_URL", Settings.mathpix_api_url),
        mathpix_app_id=os.getenv("MATHPIX_APP_ID") or None,
        mathpix_app_key=os.getenv("MATHPIX_APP_KEY") or None,
    )
