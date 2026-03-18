from __future__ import annotations

import logging
from typing import Any, List, Optional
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.services.tutor_service import TutorService

router = APIRouter(prefix="/tutor", tags=["tutor"])
tutor_service = TutorService()

class TutorMessage(BaseModel):
    id: str
    role: str
    content: str
    createdAt: str

class TutorRequestPayload(BaseModel):
    confirmedExpressionLatex: str
    conversation: List[TutorMessage]
    requestedAction: Optional[str] = None

class TutorResponsePayload(BaseModel):
    message: TutorMessage
    actionRequest: Optional[Any] = None

@router.post("/analyze", response_model=TutorResponsePayload)
async def analyze_expression(payload: TutorRequestPayload) -> TutorResponsePayload:
    try:
        result = await tutor_service.analyze(payload.confirmedExpressionLatex, payload.requestedAction)
        # We transform it a bit for the response payload
        return TutorResponsePayload(**result)
    except Exception as exc:
        logging.error(f"Tutor analysis failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
