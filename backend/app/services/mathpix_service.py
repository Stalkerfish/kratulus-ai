"""Mathpix OCR integration service."""

from __future__ import annotations

import os
from typing import Any, Sequence

import httpx
from fastapi import HTTPException


class MathpixService:
    """Client wrapper for Mathpix v3 text recognition."""

    MATHPIX_URL = "https://api.mathpix.com/v3/text"

    def __init__(
        self,
        client: httpx.AsyncClient | None = None,
        timeout_seconds: float = 20.0,
    ) -> None:
        self._client = client or httpx.AsyncClient(timeout=timeout_seconds)
        self._owns_client = client is None

    async def close(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def recognize_strokes(
        self,
        strokes: Sequence[dict[str, Any]] | dict[str, Any],
        image_snapshot: str | None = None,
    ) -> dict[str, Any]:
        app_id = os.getenv("MATHPIX_APP_ID")
        app_key = os.getenv("MATHPIX_APP_KEY")
        if not app_id or not app_key:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Mathpix credentials are missing. Set MATHPIX_APP_ID and "
                    "MATHPIX_APP_KEY in the server environment."
                ),
            )

        payload: dict[str, Any] = {
            "strokes": self._format_strokes(strokes),
            "formats": ["latex_styled", "latex", "wolfram"],
            "data_options": {
                "include_confidence": True,
                "include_latex_confidence": True,
                "include_word_data": True,
                "include_line_data": True,
            },
        }
        if image_snapshot:
            payload["src"] = image_snapshot

        headers = {
            "app_id": app_id,
            "app_key": app_key,
            "Content-Type": "application/json",
        }

        try:
            response = await self._client.post(self.MATHPIX_URL, json=payload, headers=headers)
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=504,
                detail="Mathpix request timed out while recognizing strokes.",
            ) from exc
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Unable to reach Mathpix upstream service: {exc}",
            ) from exc

        if response.status_code in (401, 403):
            raise HTTPException(
                status_code=500,
                detail=(
                    "Mathpix authentication failed. Verify MATHPIX_APP_ID and "
                    "MATHPIX_APP_KEY are valid for this environment."
                ),
            )

        if response.status_code >= 500:
            raise HTTPException(
                status_code=502,
                detail="Mathpix upstream service returned a server error.",
            )

        if response.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail=f"Mathpix request failed with status {response.status_code}.",
            )

        try:
            data = response.json()
        except ValueError as exc:
            raise HTTPException(
                status_code=502,
                detail="Mathpix returned a malformed JSON response.",
            ) from exc

        if not isinstance(data, dict):
            raise HTTPException(
                status_code=502,
                detail="Mathpix returned an unexpected response shape.",
            )

        return data

    @staticmethod
    def _format_strokes(strokes: Sequence[dict[str, Any]] | dict[str, Any]) -> dict[str, Any]:
        """Normalize stroke data to Mathpix's expected nested payload format."""
        if isinstance(strokes, dict):
            if "strokes" in strokes and isinstance(strokes["strokes"], list):
                return {"strokes": strokes["strokes"]}
            if isinstance(strokes.get("x"), list) and isinstance(strokes.get("y"), list):
                return {"strokes": [strokes]}
            raise HTTPException(
                status_code=422,
                detail="Invalid stroke format. Expected a list of stroke objects.",
            )

        if isinstance(strokes, Sequence):
            normalized = list(strokes)
            if not normalized:
                raise HTTPException(
                    status_code=422,
                    detail="Stroke list cannot be empty.",
                )
            return {"strokes": normalized}

        raise HTTPException(
            status_code=422,
            detail="Invalid stroke payload. Provide a stroke list in Mathpix format.",
        )
