from __future__ import annotations

from typing import Any, Mapping, Sequence

from pydantic import BaseModel, Field, model_validator

MATH_NODE_REVIEW_THRESHOLD = 0.85


class MathNode(BaseModel):
    latex_segment: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    requires_review: bool = False

    @model_validator(mode="after")
    def set_review_flag(self) -> "MathNode":
        self.requires_review = self.confidence_score < MATH_NODE_REVIEW_THRESHOLD
        return self


class ProcessInkResponse(BaseModel):
    latex: str
    confidence: float = Field(ge=0.0, le=1.0)
    math_nodes: list[MathNode] = Field(min_length=1)


def _coerce_confidence(raw_confidence: Any, default: float = 0.0) -> float:
    try:
        confidence = float(raw_confidence)
    except (TypeError, ValueError):
        return default

    return min(1.0, max(0.0, confidence))


def _coerce_latex_segment(item: Mapping[str, Any]) -> str:
    for key in ("latex", "token", "text", "value"):
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            return value

    return ""


def _build_nodes_from_items(items: Sequence[Mapping[str, Any]]) -> list[MathNode]:
    math_nodes: list[MathNode] = []

    for item in items:
        if not isinstance(item, Mapping):
            continue

        latex_segment = _coerce_latex_segment(item)
        if not latex_segment:
            continue

        confidence_score = _coerce_confidence(
            item.get("confidence_score", item.get("confidence", item.get("region_confidence", item.get("token_confidence"))))
        )
        math_nodes.append(
            MathNode(
                latex_segment=latex_segment,
                confidence_score=confidence_score,
            )
        )

    return math_nodes


def map_mathpix_confidence_to_nodes(mathpix_payload: Mapping[str, Any], fallback_latex: str | None = None) -> list[MathNode]:
    """Map Mathpix token/region confidence granularity into MathNode entries.

    Fallback behavior: when no token/region-level confidence data is available,
    return one full-expression node with confidence 0.0 so it is explicitly flagged
    for downstream review.
    """

    token_items = mathpix_payload.get("tokens")
    region_items = mathpix_payload.get("regions")

    all_items: list[Mapping[str, Any]] = []
    if isinstance(token_items, Sequence) and not isinstance(token_items, (str, bytes)):
        all_items.extend(item for item in token_items if isinstance(item, Mapping))

    if isinstance(region_items, Sequence) and not isinstance(region_items, (str, bytes)):
        all_items.extend(item for item in region_items if isinstance(item, Mapping))

    math_nodes = _build_nodes_from_items(all_items)
    if math_nodes:
        return math_nodes

    full_expression = fallback_latex
    if not full_expression:
        for key in ("latex_styled", "latex_normal", "latex", "text"):
            candidate = mathpix_payload.get(key)
            if isinstance(candidate, str) and candidate.strip():
                full_expression = candidate
                break

    return [
        MathNode(
            latex_segment=full_expression or "<expression-unavailable>",
            confidence_score=0.0,
        )
    ]
