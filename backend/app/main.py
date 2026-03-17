from __future__ import annotations

from fastapi import FastAPI

from dotenv import load_dotenv

from app.api.process_ink import router as process_ink_router
from app.config import get_settings
from app.routers.ocr import router as ocr_router


load_dotenv()
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


app.include_router(ocr_router, prefix="/api")
app.include_router(process_ink_router, prefix="/api")
