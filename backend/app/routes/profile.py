from fastapi import APIRouter
from app.services.profile_service import trigger_profile_update
from app.services.db_service import get_latest_learner_profile
from app.database import get_db
import json

router = APIRouter()


@router.post("/profile/update")
async def update_profile():
    """학습자 프로필을 즉시 갱신합니다. (수동 트리거)"""
    trigger_profile_update()
    return {"status": "triggered"}


@router.get("/profile")
async def get_profile():
    """최신 학습자 프로필을 반환합니다."""
    profile = get_latest_learner_profile()
    if not profile:
        return {"profile": None}

    for field in ("top_errors", "weak_areas", "strong_areas", "recent_topics", "vocab_stats"):
        if profile.get(field) and isinstance(profile[field], str):
            try:
                profile[field] = json.loads(profile[field])
            except Exception:
                pass

    return {"profile": profile}


@router.get("/profile/context")
async def get_personal_context():
    """개인 컨텍스트(직업/가족/관심사 등)를 카테고리별로 반환합니다."""
    with get_db() as db:
        rows = db.execute(
            "SELECT category, content FROM personal_context ORDER BY updated_at DESC"
        ).fetchall()
    return {r["category"]: r["content"] for r in rows}
