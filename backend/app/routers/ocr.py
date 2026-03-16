from __future__ import annotations

from statistics import mean
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field, model_validator


router = APIRouter(prefix="/ocr", tags=["ocr"])


class Stroke(BaseModel):
    x: list[float] = Field(default_factory=list, min_length=1)
    y: list[float] = Field(default_factory=list, min_length=1)
    t: list[float] = Field(default_factory=list, min_length=1)

    @model_validator(mode="after")
    def validate_lengths(self) -> "Stroke":
        if not (len(self.x) == len(self.y) == len(self.t)):
            raise ValueError("x, y, and t arrays must have matching lengths")
        return self


class ProcessInkRequest(BaseModel):
    strokes: list[Stroke] = Field(default_factory=list, min_length=1)
    image_snapshot: str | None = Field(
        default=None,
        description="Optional base64-encoded image snapshot of the ink canvas.",
    )


class MathpixNormalizedOutput(BaseModel):
    latex_styled: str | None = None
    latex_simplified: str | None = None
    text: str | None = None
    confidence: float | None = None
    detection_map: dict[str, Any] = Field(default_factory=dict)


class ParsedAstNode(BaseModel):
    type: str
    value: str | None = None
    children: list["ParsedAstNode"] = Field(default_factory=list)


class ConfidenceAwareMathNode(BaseModel):
    node_id: str
    symbol: str
    confidence: float = Field(ge=0.0, le=1.0)
    source: str = "stroke"


class ProcessInkResponse(BaseModel):
    mathpix: MathpixNormalizedOutput
    ast: ParsedAstNode
    confidence_nodes: list[ConfidenceAwareMathNode]


ParsedAstNode.model_rebuild()


def _build_fallback_ast(stroke_count: int, mean_points_per_stroke: float) -> ParsedAstNode:
    return ParsedAstNode(
        type="Expression",
        children=[
            ParsedAstNode(type="StrokeCount", value=str(stroke_count)),
            ParsedAstNode(type="AvgPointsPerStroke", value=f"{mean_points_per_stroke:.2f}"),
        ],
    )


@router.post("/process-ink", response_model=ProcessInkResponse)
def process_ink(payload: ProcessInkRequest) -> ProcessInkResponse:
    point_counts = [len(stroke.x) for stroke in payload.strokes]
    stroke_count = len(payload.strokes)
    avg_points = mean(point_counts)

    mathpix_output = MathpixNormalizedOutput(
        latex_styled="\\text{ink}_%d" % stroke_count,
        latex_simplified="ink_%d" % stroke_count,
        text="ink input",
        confidence=max(0.1, min(0.99, avg_points / 50.0)),
        detection_map={
            "strokes": stroke_count,
            "snapshot_present": bool(payload.image_snapshot),
        },
    )

    confidence_nodes = [
        ConfidenceAwareMathNode(
            node_id=f"stroke-{idx}",
            symbol="stroke",
            confidence=max(0.05, min(0.99, len(stroke.x) / 40.0)),
        )
        for idx, stroke in enumerate(payload.strokes)
    ]

    return ProcessInkResponse(
        mathpix=mathpix_output,
        ast=_build_fallback_ast(stroke_count, avg_points),
        confidence_nodes=confidence_nodes,
    )
