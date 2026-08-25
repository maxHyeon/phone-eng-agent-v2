from fastapi import APIRouter, HTTPException

from app.models import QuizOut, QuizAnswer
from app.services import db_service

router = APIRouter()


@router.get("/lessons/{lesson_id}/quizzes", response_model=list[QuizOut])
async def get_quizzes(lesson_id: int):
    return db_service.get_quizzes(lesson_id)


@router.put("/quizzes/{quiz_id}/answer", response_model=QuizOut)
async def answer_quiz(quiz_id: int, data: QuizAnswer):
    result = db_service.answer_quiz(quiz_id, data.user_answer)
    if not result:
        raise HTTPException(404, "Quiz not found")
    return result
