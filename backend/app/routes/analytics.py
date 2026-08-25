from fastapi import APIRouter

from app.models import ErrorPatternOut
from app.services import db_service

router = APIRouter()


@router.get("/analytics/error-patterns", response_model=list[ErrorPatternOut])
async def get_error_patterns():
    return db_service.get_error_patterns()


@router.get("/analytics/stats")
async def get_stats():
    return db_service.get_error_stats()
