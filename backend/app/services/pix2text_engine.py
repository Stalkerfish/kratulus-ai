from __future__ import annotations

from io import BytesIO
import asyncio
import logging
import math
from threading import Lock
from typing import Any

from fastapi import HTTPException

try:
    from PIL import Image, ImageDraw
except Exception:  # pragma: no cover
    Image = None
    ImageDraw = None

from app.services.base import OCREngine, OCREngineName, OCRResult, OCRToken

try:
    from pix2text import Pix2Text
except Exception:  # pragma: no cover
    Pix2Text = None

LOGGER = logging.getLogger(__name__)
_RED = "[91m"
_RESET = "[0m"
_TARGET_DPI = 300
_SYMBOL_HINTS = "∇ ∭ ∂"


class Pix2TextEngine(OCREngine):
    engine_name = OCREngineName.pix2text
    _shared_model: Any = None
    _model_lock: Lock = Lock()

    async def recognize(self, strokes: list[dict[str, Any]], canvas_meta: dict[str, Any]) -> OCRResult:
        if Pix2Text is None or Image is None or ImageDraw is None:
            raise HTTPException(status_code=500, detail="pix2text/Pillow dependencies are not installed.")

        image_bytes = await asyncio.to_thread(self._render_strokes, strokes, canvas_meta)
        model = await asyncio.to_thread(self._get_model)
        try:
            image = Image.open(BytesIO(image_bytes))
            result = await asyncio.to_thread(model.recognize, image)
        except Exception as exc:  # noqa: BLE001
            LOGGER.error("%sPix2Text recognition failed.%s", _RED, _RESET, exc_info=exc)
            raise HTTPException(status_code=502, detail="Pix2Text recognition failed.") from exc

        latex = self._extract_latex(result)
        confidence = self._extract_confidence(result)
        return OCRResult(
            engine=self.engine_name,
            latex_styled=latex,
            latex_simplified=latex,
            text=latex,
            confidence=confidence,
            raw_response=result if isinstance(result, dict) else {"result": result},
            tokens=[OCRToken(value=latex or "<empty>", confidence=confidence, source="pix2text")],
            metadata={"render_dpi": _TARGET_DPI, "symbol_hint": _SYMBOL_HINTS},
        )

    @classmethod
    def _get_model(cls) -> Any:
        with cls._model_lock:
            if cls._shared_model is None:
                if Pix2Text is None:
                    raise RuntimeError("pix2text is unavailable")
                cls._shared_model = Pix2Text(
                    analyzer_config={"model_name": "mfd-1.5"},
                    formula_config={"model_name": "mfr-1.5"},
                )
            return cls._shared_model

    @staticmethod
    def _render_strokes(strokes: list[dict[str, Any]], canvas_meta: dict[str, Any]) -> bytes:
        width = max(float(canvas_meta.get("width", _max_coord(strokes, "x") + 24)), 1.0)
        height = max(float(canvas_meta.get("height", _max_coord(strokes, "y") + 24)), 1.0)
        source_x_dpi = float(canvas_meta.get("xDPI", canvas_meta.get("x_dpi", 96))) or 96.0
        source_y_dpi = float(canvas_meta.get("yDPI", canvas_meta.get("y_dpi", 96))) or 96.0
        scale_x = _TARGET_DPI / source_x_dpi
        scale_y = _TARGET_DPI / source_y_dpi
        image = Image.new("L", (math.ceil(width * scale_x), math.ceil(height * scale_y)), color=255)
        draw = ImageDraw.Draw(image)

        for stroke in strokes:
            points = [
                (float(x) * scale_x, float(y) * scale_y)
                for x, y in zip(stroke.get("x", []), stroke.get("y", []), strict=False)
            ]
            if len(points) == 1:
                x, y = points[0]
                draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=0)
            elif len(points) > 1:
                draw.line(points, fill=0, width=max(2, round(2.5 * ((scale_x + scale_y) / 2))))

        image = image.point(lambda px: 0 if px < 200 else 255, mode="1")
        buffer = BytesIO()
        image.save(buffer, format="PNG", dpi=(_TARGET_DPI, _TARGET_DPI), optimize=True)
        return buffer.getvalue()

    @staticmethod
    def _extract_latex(result: Any) -> str:
        if isinstance(result, str):
            return result.strip()
        if isinstance(result, list) and result:
            first = result[0]
            if isinstance(first, dict):
                for key in ("text", "latex", "formula"):
                    value = first.get(key)
                    if isinstance(value, str) and value.strip():
                        return value
        if isinstance(result, dict):
            for key in ("text", "latex", "formula"):
                value = result.get(key)
                if isinstance(value, str) and value.strip():
                    return value
            if isinstance(result.get("results"), list):
                return Pix2TextEngine._extract_latex(result["results"])
        return ""

    @staticmethod
    def _extract_confidence(result: Any) -> float:
        if isinstance(result, dict):
            for key in ("score", "confidence", "prob"):
                value = result.get(key)
                if isinstance(value, (int, float)):
                    return max(0.0, min(1.0, float(value)))
            if isinstance(result.get("results"), list) and result["results"]:
                return Pix2TextEngine._extract_confidence(result["results"][0])
        if isinstance(result, list) and result and isinstance(result[0], dict):
            return Pix2TextEngine._extract_confidence(result[0])
        return 0.0


def _max_coord(strokes: list[dict[str, Any]], axis: str) -> float:
    values = [float(v) for stroke in strokes for v in stroke.get(axis, [])]
    return max(values, default=0.0)
