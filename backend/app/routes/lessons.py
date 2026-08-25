from fastapi import APIRouter, HTTPException

from app.models import LessonCreate, LessonUpdate, LessonOut, ConversationSaveRequest, ReviewSummaryOut
from app.services import db_service

router = APIRouter()


@router.post("/lessons", response_model=LessonOut)
async def create_lesson(data: LessonCreate):
    return db_service.create_lesson(data.model_dump())


@router.get("/lessons", response_model=list[LessonOut])
async def list_lessons(date: str | None = None):
    return db_service.get_lessons(date)


@router.get("/lessons/today", response_model=LessonOut)
async def get_today_lesson():
    return db_service.get_or_create_today_lesson()


@router.get("/lessons/previous", response_model=LessonOut)
async def get_previous_lesson(current_lesson_id: int):
    lesson = db_service.get_previous_lesson(current_lesson_id)
    if not lesson:
        raise HTTPException(404, "No previous completed lesson found")
    return lesson


@router.get("/lessons/{lesson_id}", response_model=LessonOut)
async def get_lesson(lesson_id: int):
    lesson = db_service.get_lesson(lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    return lesson


@router.get("/lessons/{lesson_id}/review-summary", response_model=ReviewSummaryOut)
async def get_review_summary(lesson_id: int):
    lesson = db_service.get_lesson(lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    return db_service.get_review_summary(lesson_id)


@router.put("/lessons/{lesson_id}", response_model=LessonOut)
async def update_lesson(lesson_id: int, data: LessonUpdate):
    result = db_service.update_lesson(lesson_id, data.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(404, "Lesson not found")
    return result


@router.delete("/lessons/{lesson_id}")
async def delete_lesson(lesson_id: int):
    deleted = db_service.delete_lesson(lesson_id)
    if not deleted:
        raise HTTPException(404, "Lesson not found")
    return {"status": "deleted"}


@router.post("/lessons/{lesson_id}/conversations")
async def save_conversations(lesson_id: int, data: ConversationSaveRequest):
    lesson = db_service.get_lesson(lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    db_service.save_conversation_logs(lesson_id, data.conversations)
    return {"status": "saved"}


@router.get("/lessons/{lesson_id}/conversations")
async def get_conversations(lesson_id: int):
    lesson = db_service.get_lesson(lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    return db_service.get_conversation_logs(lesson_id)
