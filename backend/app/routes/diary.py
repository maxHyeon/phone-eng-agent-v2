from fastapi import APIRouter, HTTPException

from app.models import DiaryCreate, DiaryMemoUpdate, DiaryEntryOut
from app.services import db_service
from app.ai_client import get_client
from app.config import get_claude_model

router = APIRouter()

DIARY_CORRECTION_PROMPT = """You are an English writing assistant. The user will provide text in Korean or English (or a mix). Your job is to produce a natural, fluent English version of what they wrote.

Rules:
- If the input is Korean, translate it into natural English.
- If the input is already English, correct grammar, word choice, and flow while preserving the original meaning.
- Keep the same tone and style (casual diary entry).
- Output ONLY the corrected/translated English text, nothing else."""


@router.get("/diary/dates", response_model=list[str])
async def get_diary_dates(year: int, month: int):
    return db_service.get_diary_dates(year, month)


@router.get("/diary/{date}", response_model=list[DiaryEntryOut])
async def get_diary_by_date(date: str):
    return db_service.get_diary_by_date(date)


@router.post("/diary", response_model=DiaryEntryOut, status_code=201)
async def create_diary(data: DiaryCreate):
    # AI correction
    ai_output = None
    try:
        client = get_client()
        response = client.messages.create(
            model=get_claude_model(),
            max_tokens=1024,
            system=DIARY_CORRECTION_PROMPT,
            messages=[{"role": "user", "content": data.user_input}],
        )
        ai_output = response.content[0].text.strip()
    except Exception:
        pass  # Save entry without AI output on failure

    entry = db_service.create_diary_entry(
        date=data.date,
        user_input=data.user_input,
        ai_output=ai_output,
        memo=data.memo,
    )
    return entry


@router.put("/diary/{diary_id}/memo", response_model=DiaryEntryOut)
async def update_memo(diary_id: int, data: DiaryMemoUpdate):
    result = db_service.update_diary_memo(diary_id, data.memo)
    if not result:
        raise HTTPException(status_code=404, detail="Diary entry not found")
    return result


@router.delete("/diary/{diary_id}")
async def delete_diary(diary_id: int):
    if not db_service.delete_diary_entry(diary_id):
        raise HTTPException(status_code=404, detail="Diary entry not found or not deletable")
    return {"status": "deleted"}
