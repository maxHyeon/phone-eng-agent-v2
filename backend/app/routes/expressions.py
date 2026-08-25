from fastapi import APIRouter

from app.models import ExpressionOut
from app.services import db_service

router = APIRouter()


@router.get("/expressions", response_model=list[ExpressionOut])
async def list_expressions(search: str | None = None):
    return db_service.get_expressions(search=search)


@router.get("/lessons/{lesson_id}/expressions", response_model=list[ExpressionOut])
async def get_lesson_expressions(lesson_id: int):
    return db_service.get_expressions(lesson_id=lesson_id)
