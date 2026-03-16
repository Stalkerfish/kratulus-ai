from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CorrectionUpdate(BaseModel):
    """User-submitted correction payload for re-processing an expression."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    session_id: str | None = Field(default=None, min_length=1)
    expression_id: str | None = Field(default=None, min_length=1)
    corrected_latex: str = Field(min_length=1)
    source_latex: str | None = None
    user_id: str | None = None
    user_role: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def ensure_identifier(self) -> "CorrectionUpdate":
        if not self.session_id and not self.expression_id:
            raise ValueError("Either session_id or expression_id is required.")
        return self


class MathNode(BaseModel):
    node_type: str
    value: str
    confidence: float
    status: Literal["parsed", "user_confirmed"] = "parsed"


class CorrectionResult(BaseModel):
    id: str
    corrected_latex: str
    source_latex: str | None = None
    ast: dict[str, Any]
    math_nodes: list[MathNode]
    parser: Literal["sympy"] = "sympy"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CorrectionRecord(BaseModel):
    id: str
    request: CorrectionUpdate
    result: CorrectionResult
