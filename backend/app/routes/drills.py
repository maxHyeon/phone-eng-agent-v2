from fastapi import APIRouter, HTTPException

from app.models import DrillOut, DrillToggle
from app.services import db_service

router = APIRouter()


@router.get("/lessons/{lesson_id}/drills", response_model=list[DrillOut])
async def get_drills(lesson_id: int):
    return db_service.get_drills(lesson_id)


@router.put("/drills/{drill_id}/toggle", response_model=DrillOut)
async def toggle_drill(drill_id: int, data: DrillToggle):
    result = db_service.toggle_drill(drill_id, data.is_completed)
    if not result:
        raise HTTPException(404, "Drill not found")
    return result
