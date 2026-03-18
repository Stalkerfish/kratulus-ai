from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.models.correction import CorrectionRecord, CorrectionResult, CorrectionUpdate
from app.services.correction_store import correction_store
from app.services.sympy_pipeline import LatexParseError, parse_corrected_latex

router = APIRouter(prefix="/process-ink", tags=["process-ink"])


@router.post("/correction", response_model=CorrectionResult)
def process_correction(payload: CorrectionUpdate) -> CorrectionResult:
    correction_id = payload.expression_id or payload.session_id
    if not correction_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Either session_id or expression_id is required.",
        )

    try:
        _, ast, math_nodes = parse_corrected_latex(payload.corrected_latex)
    except LatexParseError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    prior = correction_store.get(correction_id)
    source_latex = payload.source_latex
    if source_latex is None and prior is not None:
        source_latex = prior.result.corrected_latex

    result = CorrectionResult(
        id=correction_id,
        corrected_latex=payload.corrected_latex,
        source_latex=source_latex,
        ast=ast,
        math_nodes=math_nodes,
    )

    correction_store.upsert(CorrectionRecord(id=correction_id, request=payload, result=result))
    return result
