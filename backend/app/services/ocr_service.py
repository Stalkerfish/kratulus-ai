from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx
from fastapi import HTTPException

from app.services.base import OCREngine, OCREngineName, OCRResult
from app.services.myscript_engine import MyScriptEngine
from app.services.pix2text_engine import Pix2TextEngine

LOGGER = logging.getLogger(__name__)
_RED = "[91m"
_YELLOW = "[93m"
_BLUE = "[94m"
_RESET = "[0m"


class OCRService:
    def __init__(self, myscript_engine: OCREngine | None = None, pix2text_engine: OCREngine | None = None) -> None:
        self._myscript_engine = myscript_engine or MyScriptEngine()
        self._pix2text_engine = pix2text_engine or Pix2TextEngine()

    async def recognize(
        self,
        strokes: list[dict[str, Any]],
        canvas_meta: dict[str, Any],
        preferred_engine: OCREngineName,
    ) -> OCRResult:
        if preferred_engine == OCREngineName.pix2text:
            return await self._pix2text_engine.recognize(strokes, canvas_meta)

        try:
            return await self._myscript_engine.recognize(strokes, canvas_meta)
        except (asyncio.TimeoutError, httpx.TimeoutException) as exc:
            LOGGER.warning("%sMyScript timed out; retrying with Pix2Text.%s", _YELLOW, _RESET, exc_info=exc)
        except HTTPException as exc:
            if exc.status_code not in {401, 500, 502, 504}:
                raise
            LOGGER.warning(
                "%sMyScript failed with %s; retrying with Pix2Text.%s",
                _YELLOW,
                exc.status_code,
                _RESET,
                exc_info=exc,
            )
        except Exception as exc:  # noqa: BLE001
            LOGGER.error("%sUnexpected MyScript failure; retrying with Pix2Text.%s", _RED, _RESET, exc_info=exc)

        try:
            return await self._pix2text_engine.recognize(strokes, canvas_meta)
        except Exception as exc:  # noqa: BLE001
            LOGGER.error("%sPix2Text fallback failed.%s", _RED, _RESET, exc_info=exc)
            raise HTTPException(status_code=502, detail="OCR processing failed for both MyScript and Pix2Text.") from exc
