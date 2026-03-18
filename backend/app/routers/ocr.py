from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

from app.models.ocr import MATH_NODE_REVIEW_THRESHOLD
from app.services.base import OCREngineName
from app.services.ocr_service import OCRService
from app.services.sympy_pipeline import LatexParseError, parse_corrected_latex

router = APIRouter(prefix="/ocr", tags=["ocr"])
ocr_service = OCRService()


class Stroke(BaseModel):
    x: list[float] = Field(default_factory=list, min_length=1)
    y: list[float] = Field(default_factory=list, min_length=1)
    t: list[float] = Field(default_factory=list, min_length=1)

    @model_validator(mode="after")
    def validate_lengths(self) -> "Stroke":
        if not (len(self.x) == len(self.y) == len(self.t)):
            raise ValueError("x, y, and t arrays must have matching lengths")
        return self


class CanvasMeta(BaseModel):
    width: float | None = None
    height: float | None = None
    xDPI: float = 96.0
    yDPI: float = 96.0


class ProcessInkRequest(BaseModel):
    strokes: list[Stroke] = Field(default_factory=list, min_length=1)
    canvas_meta: CanvasMeta = Field(default_factory=CanvasMeta)
    preferred_engine: OCREngineName = OCREngineName.myscript


class OCRNormalizedOutput(BaseModel):
    engine: OCREngineName
    latex_styled: str | None = None
    latex_simplified: str | None = None
    text: str | None = None
    confidence: float | None = None
    requires_review: bool = False
    detection_map: dict[str, Any] = Field(default_factory=dict)


class ParsedAstNode(BaseModel):
    type: str
    value: str | None = None
    confidence: float = 1.0
    requires_review: bool = False
    children: list["ParsedAstNode"] = Field(default_factory=list)


class ConfidenceAwareMathNode(BaseModel):
    node_id: str
    symbol: str
    confidence: float = Field(ge=0.0, le=1.0)
    source: str = "ocr"
    requires_review: bool = False


class ProcessInkResponse(BaseModel):
    ocr: OCRNormalizedOutput
    mathpix: OCRNormalizedOutput | None = Field(default=None, description="Deprecated compatibility mirror of the OCR payload.")
    ast: ParsedAstNode
    confidence_nodes: list[ConfidenceAwareMathNode]


ParsedAstNode.model_rebuild()


def _build_review_ast(reason: str) -> ParsedAstNode:
    return ParsedAstNode(type="UnparsedExpression", value=reason, confidence=0.0, requires_review=True)


def _map_sympy_ast_to_model(ast_dict: dict[str, Any]) -> ParsedAstNode:
    return ParsedAstNode(
        type=ast_dict.get("type", "Unknown"),
        value=ast_dict.get("value", ast_dict.get("str")),
        confidence=float(ast_dict.get("confidence", 1.0) or 0.0),
        requires_review=bool(ast_dict.get("requires_review", False)),
        children=[_map_sympy_ast_to_model(c) for c in ast_dict.get("children", [])],
    )


@router.post("/process-ink", response_model=ProcessInkResponse)
async def process_ink(payload: ProcessInkRequest) -> ProcessInkResponse:
    strokes_payload = [s.model_dump() for s in payload.strokes]

    try:
        result = await ocr_service.recognize(
            strokes=strokes_payload,
            canvas_meta=payload.canvas_meta.model_dump(exclude_none=True),
            preferred_engine=payload.preferred_engine,
        )
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"OCR service error: {exc}") from exc

    review_required = result.confidence < MATH_NODE_REVIEW_THRESHOLD
    ocr_output = OCRNormalizedOutput(
        engine=result.engine,
        latex_styled=result.latex_styled,
        latex_simplified=result.latex_simplified,
        text=result.text,
        confidence=result.confidence,
        requires_review=review_required,
        detection_map={
            "stroke_count": len(payload.strokes),
            "raw_engine": result.engine,
            **result.metadata,
        },
    )

    try:
        if result.latex_styled:
            _, sympy_ast, math_nodes = parse_corrected_latex(result.latex_styled, default_confidence=result.confidence)
            ast_result = _map_sympy_ast_to_model(sympy_ast)
        else:
            ast_result = _build_review_ast("OCR returned an empty expression.")
            math_nodes = []
    except LatexParseError:
        ast_result = _build_review_ast(result.latex_styled or "Unable to parse OCR output.")
        math_nodes = []

    confidence_nodes = [
        ConfidenceAwareMathNode(
            node_id=f"node-{idx}",
            symbol=node.get("value", ""),
            confidence=float(node.get("confidence", 0.0) or 0.0),
            source=result.engine.value,
            requires_review=bool(node.get("requires_review", False)),
        )
        for idx, node in enumerate(math_nodes)
    ] or [
        ConfidenceAwareMathNode(
            node_id="node-0",
            symbol=result.latex_styled or "<empty>",
            confidence=result.confidence,
            source=result.engine.value,
            requires_review=review_required,
        )
    ]

    return ProcessInkResponse(ocr=ocr_output, mathpix=ocr_output, ast=ast_result, confidence_nodes=confidence_nodes)
