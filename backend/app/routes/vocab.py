from fastapi import APIRouter, HTTPException

from app.models import VocabCreate, VocabUpdate, VocabOut, VocabMasteryUpdate
from app.services import db_service

router = APIRouter()


@router.post("/vocab", response_model=VocabOut, status_code=201)
async def create_vocab(data: VocabCreate):
    return db_service.create_vocab(data.model_dump())


@router.get("/vocab", response_model=list[VocabOut])
async def list_vocabs(category: str | None = None, search: str | None = None, sort: str = "newest"):
    return db_service.get_vocabs(category=category, search=search, sort=sort)


@router.get("/vocab/flashcard", response_model=list[VocabOut])
async def get_flashcards(category: str | None = None):
    return db_service.get_vocab_flashcards(category=category)


@router.get("/vocab/{vocab_id}", response_model=VocabOut)
async def get_vocab(vocab_id: int):
    vocab = db_service.get_vocab(vocab_id)
    if not vocab:
        raise HTTPException(404, "Vocab entry not found")
    return vocab


@router.put("/vocab/{vocab_id}", response_model=VocabOut)
async def update_vocab(vocab_id: int, data: VocabUpdate):
    result = db_service.update_vocab(vocab_id, data.model_dump(exclude_none=True))
    if not result:
        raise HTTPException(404, "Vocab entry not found")
    return result


@router.delete("/vocab/{vocab_id}")
async def delete_vocab(vocab_id: int):
    deleted = db_service.delete_vocab(vocab_id)
    if not deleted:
        raise HTTPException(404, "Vocab entry not found")
    return {"status": "deleted"}


@router.put("/vocab/{vocab_id}/mastery", response_model=VocabOut)
async def update_mastery(vocab_id: int, data: VocabMasteryUpdate):
    result = db_service.update_vocab_mastery(vocab_id, data.mastery)
    if not result:
        raise HTTPException(404, "Vocab entry not found")
    return result
