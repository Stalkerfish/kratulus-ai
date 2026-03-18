from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
from typing import Any

import httpx
from fastapi import HTTPException

from app.services.base import OCREngine, OCREngineName, OCRResult, OCRToken

LOGGER = logging.getLogger(__name__)
_RED = "[91m"
_RESET = "[0m"


class MyScriptEngine(OCREngine):
    engine_name = OCREngineName.myscript
    MYSCRIPT_URL = "https://cloud.myscript.com/api/v4.0/iink/batch"

    def __init__(self, client: httpx.AsyncClient | None = None, timeout_seconds: float = 15.0) -> None:
        self._client = client or httpx.AsyncClient(timeout=timeout_seconds)
        self._owns_client = client is None

    async def close(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def recognize(self, strokes: list[dict[str, Any]], canvas_meta: dict[str, Any]) -> OCRResult:
        application_key = os.getenv("MYSCRIPT_APPLICATION_KEY")
        hmac_key = os.getenv("MYSCRIPT_HMAC_KEY")
        if not application_key or not hmac_key:
            raise HTTPException(status_code=500, detail="MyScript credentials are missing.")

        body = self._build_request_body(strokes, canvas_meta)
        encoded_body = json.dumps(body, separators=(",", ":")).encode("utf-8")
        headers = {
            "applicationKey": application_key,
            "hmac": hmac.new(
                f"{application_key}{hmac_key}".encode("utf-8"),
                encoded_body,
                hashlib.sha512,
            ).hexdigest(),
            "Content-Type": "application/json",
            "Accept": "application/vnd.myscript.jiix,application/json",
        }

        try:
            response = await self._client.post(self.MYSCRIPT_URL, content=encoded_body, headers=headers)
        except httpx.TimeoutException as exc:
            raise HTTPException(status_code=504, detail="MyScript request timed out.") from exc
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"Unable to reach MyScript: {exc}") from exc

        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="MyScript authentication failed.")
        if response.status_code >= 500:
            raise HTTPException(status_code=500, detail="MyScript upstream returned a server error.")
        if response.status_code >= 400:
            detail = response.text.strip() or f"MyScript request failed with status {response.status_code}."
            raise HTTPException(status_code=502, detail=detail)

        try:
            data = response.json()
        except ValueError as exc:
            LOGGER.error("%sMyScript returned malformed JSON.%s", _RED, _RESET, exc_info=exc)
            raise HTTPException(status_code=502, detail="MyScript returned malformed JSON.") from exc

        latex = self._extract_latex(data)
        confidence = self._extract_confidence(data)
        return OCRResult(
            engine=self.engine_name,
            latex_styled=latex,
            latex_simplified=latex,
            text=self._extract_text(data, latex),
            confidence=confidence,
            raw_response=data,
            tokens=[OCRToken(value=latex or "<empty>", confidence=confidence, source="myscript")],
            metadata={"mime_type": response.headers.get("content-type", "application/json")},
        )

    def _build_request_body(self, strokes: list[dict[str, Any]], canvas_meta: dict[str, Any]) -> dict[str, Any]:
        width = int(float(canvas_meta.get("width", self._max_coord(strokes, "x") + 32)))
        height = int(float(canvas_meta.get("height", self._max_coord(strokes, "y") + 32)))
        x_dpi = float(canvas_meta.get("xDPI", canvas_meta.get("x_dpi", 96)))
        y_dpi = float(canvas_meta.get("yDPI", canvas_meta.get("y_dpi", 96)))
        return {
            "xDPI": x_dpi,
            "yDPI": y_dpi,
            "width": max(width, 1),
            "height": max(height, 1),
            "contentType": "Math",
            "conversionState": "DIGITAL_EDIT",
            "strokeGroups": [
                {
                    "penStyle": "color: #000000;",
                    "strokes": [self._normalize_stroke(stroke) for stroke in strokes],
                }
            ],
            "configuration": {
                "math": {
                    "mimeTypes": ["application/x-latex", "application/vnd.myscript.jiix"],
                }
            },
        }

    @staticmethod
    def _normalize_stroke(stroke: dict[str, Any]) -> dict[str, Any]:
        x = [float(v) for v in stroke.get("x", [])]
        y = [float(v) for v in stroke.get("y", [])]
        t = [int(float(v)) for v in stroke.get("t", [])] if stroke.get("t") else []
        if not x or not y or len(x) != len(y) or (t and len(t) != len(x)):
            raise HTTPException(status_code=422, detail="Invalid stroke payload for MyScript.")
        payload: dict[str, Any] = {"x": x, "y": y}
        if t:
            payload["t"] = t
        return payload

    @staticmethod
    def _max_coord(strokes: list[dict[str, Any]], axis: str) -> float:
        values = [float(v) for stroke in strokes for v in stroke.get(axis, [])]
        return max(values, default=0.0)

    @staticmethod
    def _extract_latex(data: dict[str, Any]) -> str:
        candidates = [
            data.get("label"),
            data.get("latex"),
            data.get("expression"),
            data.get("rawCandidates", [{}])[0].get("label") if isinstance(data.get("rawCandidates"), list) and data.get("rawCandidates") else None,
        ]
        for value in candidates:
            if isinstance(value, str) and value.strip():
                return value
        return ""

    @staticmethod
    def _extract_text(data: dict[str, Any], latex: str) -> str:
        value = data.get("text")
        if isinstance(value, str) and value.strip():
            return value
        return latex

    @staticmethod
    def _extract_confidence(data: dict[str, Any]) -> float:
        for key in ("confidence", "score"):
            raw = data.get(key)
            if isinstance(raw, (int, float)):
                return max(0.0, min(1.0, float(raw)))
        candidates = data.get("rawCandidates")
        if isinstance(candidates, list) and candidates:
            raw = candidates[0].get("score")
            if isinstance(raw, (int, float)):
                return max(0.0, min(1.0, float(raw)))
        return 0.0
