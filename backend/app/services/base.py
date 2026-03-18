from __future__ import annotations

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class OCREngineName(str, Enum):
    myscript = "myscript"
    pix2text = "pix2text"


class OCRToken(BaseModel):
    value: str
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    source: str = "expression"
    requires_review: bool = False


class OCRResult(BaseModel):
    engine: OCREngineName
    latex_styled: str = ""
    latex_simplified: str = ""
    text: str = ""
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    raw_response: dict[str, Any] = Field(default_factory=dict)
    tokens: list[OCRToken] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class OCREngine(ABC):
    engine_name: OCREngineName

    @abstractmethod
    async def recognize(self, strokes: list[dict[str, Any]], canvas_meta: dict[str, Any]) -> OCRResult:
        raise NotImplementedError
