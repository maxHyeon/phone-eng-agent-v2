from fastapi import APIRouter
from app.services.profile_service import trigger_profile_update, _compute_profile
from app.services.db_service import get_latest_learner_profile
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

    # JSON 문자열 필드 파싱
    for field in ("top_errors", "weak_areas", "strong_areas", "recent_topics", "vocab_stats"):
        if profile.get(field) and isinstance(profile[field], str):
            try:
                profile[field] = json.loads(profile[field])
            except Exception:
                pass

    return {"profile": profile}
