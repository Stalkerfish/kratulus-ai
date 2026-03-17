from __future__ import annotations

from statistics import mean
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

from app.services.mathpix_service import MathpixService
from app.services.sympy_pipeline import parse_corrected_latex, LatexParseError

router = APIRouter(prefix="/ocr", tags=["ocr"])
mathpix_service = MathpixService()


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


def _map_sympy_ast_to_model(ast_dict: dict[str, Any]) -> ParsedAstNode:
    """Recursively map SymPy AST dictionary entries to ParsedAstNode models."""
    return ParsedAstNode(
        type=ast_dict.get("type", "Unknown"),
        value=ast_dict.get("str"),
        children=[_map_sympy_ast_to_model(c) for c in ast_dict.get("children", [])]
    )


@router.post("/process-ink", response_model=ProcessInkResponse)
async def process_ink(payload: ProcessInkRequest) -> ProcessInkResponse:
    # 1. Stroke Analysis for fallback/metadata
    point_counts = [len(stroke.x) for stroke in payload.strokes]
    stroke_count = len(payload.strokes)
    avg_points = mean(point_counts) if point_counts else 0

    # 2. Call Mathpix Recognition
    try:
        strokes_payload = [s.model_dump() for s in payload.strokes]
        data = await mathpix_service.recognize_strokes(strokes_payload, payload.image_snapshot)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OCR service error: {exc}")

    # 3. Map Mathpix Output
    latex_styled = data.get("latex_styled", "")
    mathpix_output = MathpixNormalizedOutput(
        latex_styled=latex_styled,
        latex_simplified=data.get("latex", ""),
        text=data.get("text", ""),
        confidence=data.get("confidence", 0.0),
        detection_map={
            "strokes": stroke_count,
            "mathpix_id": data.get("id"),
        },
    )

    # 4. Attempt to generate AST via SymPy
    try:
        if latex_styled:
            _, sympy_ast, _ = parse_corrected_latex(latex_styled)
            ast_result = _map_sympy_ast_to_model(sympy_ast)
        else:
            ast_result = _build_fallback_ast(stroke_count, avg_points)
    except (LatexParseError, Exception):
        ast_result = _build_fallback_ast(stroke_count, avg_points)

    # 5. Build individual node confidence (simulated from regions if available, or stroke-based)
    # For now, keeping the stroke-based simulation as a primary feedback loop
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
        ast=ast_result,
        confidence_nodes=confidence_nodes,
    )
