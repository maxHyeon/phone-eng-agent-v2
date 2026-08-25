from fastapi import APIRouter

from app.models import CorrectionCreate, CorrectionOut
from app.services import db_service

router = APIRouter()


@router.get("/lessons/{lesson_id}/corrections", response_model=list[CorrectionOut])
async def get_corrections(lesson_id: int):
    return db_service.get_corrections(lesson_id)


@router.post("/lessons/{lesson_id}/corrections", response_model=CorrectionOut)
async def create_correction(lesson_id: int, data: CorrectionCreate):
    return db_service.save_correction(
        lesson_id=lesson_id,
        original=data.original,
        corrected=data.corrected,
        explanation=data.explanation,
        error_type=data.error_type,
        source=data.source,
    )
