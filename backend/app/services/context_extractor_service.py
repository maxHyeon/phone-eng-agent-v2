"""
context_extractor_service.py
=============================
일기 / 일상 이야기 텍스트에서 학습자의 개인 컨텍스트를 추출합니다.

- LLM(Claude)을 사용하여 텍스트에서 카테고리별 정보를 파악
- 기존 컨텍스트와 병합하여 누적 업데이트 (덮어쓰기 X)
- 백그라운드 스레드에서 실행 — 주 요청 latency에 영향 없음

카테고리:
  profession  — 직업, 일하는 분야, 직장
  family      — 가족 관계 (배우자, 자녀, 부모 등)
  interests   — 관심사, 취미, 즐기는 것
  concerns    — 걱정, 고민, 스트레스 요인
  health      — 건강 상태, 운동 습관
  lifestyle   — 생활 패턴, 루틴, 거주지 등
"""

import json
import logging
import threading
from datetime import datetime

from app.database import get_db

logger = logging.getLogger(__name__)

CATEGORIES = ["profession", "family", "interests", "concerns", "health", "lifestyle"]

CATEGORY_DESC = {
    "profession": "직업, 일하는 분야, 직장, 직책, 업무 내용",
    "family": "가족 관계 (배우자, 자녀, 부모, 형제 등), 가족 관련 상황",
    "interests": "관심사, 취미, 즐기는 활동, 좋아하는 것",
    "concerns": "걱정, 고민, 스트레스 요인, 어려운 상황",
    "health": "건강 상태, 운동 습관, 의료 관련 사항",
    "lifestyle": "생활 패턴, 일상 루틴, 식습관, 거주지, 이동 수단",
}

EXTRACT_SYSTEM_PROMPT = """당신은 텍스트에서 개인 정보를 추출하는 도우미입니다.

주어진 텍스트(일기 또는 일상 이야기)를 읽고, 아래 6개 카테고리에 해당하는 정보가 있으면 추출하세요.
정보가 없는 카테고리는 null로 반환하세요.

카테고리:
- profession: 직업, 일하는 분야, 직장, 직책, 업무 내용
- family: 가족 관계 (배우자, 자녀, 부모 등), 가족 관련 상황
- interests: 관심사, 취미, 즐기는 활동
- concerns: 걱정, 고민, 스트레스 요인
- health: 건강 상태, 운동 습관
- lifestyle: 생활 패턴, 루틴, 거주지

반드시 JSON만 출력하세요. 다른 텍스트 없이:
{
  "profession": "추출된 내용 또는 null",
  "family": "추출된 내용 또는 null",
  "interests": "추출된 내용 또는 null",
  "concerns": "추출된 내용 또는 null",
  "health": "추출된 내용 또는 null",
  "lifestyle": "추출된 내용 또는 null"
}

규칙:
- 직접 언급된 내용만 추출 (추측 금지)
- 간결하게 핵심만 (1~2문장)
- 한국어로 작성
- 해당 내용이 없으면 반드시 null"""


def _get_existing_context() -> dict[str, str]:
    """DB에서 기존 개인 컨텍스트 전체를 읽어옵니다."""
    with get_db() as db:
        rows = db.execute(
            "SELECT category, content FROM personal_context"
        ).fetchall()
    return {r["category"]: r["content"] for r in rows}


def _upsert_context(category: str, content: str, source: str = "diary") -> None:
    """카테고리별 컨텍스트를 upsert합니다."""
    with get_db() as db:
        db.execute(
            """INSERT INTO personal_context (category, content, source, updated_at)
               VALUES (?, ?, ?, datetime('now'))
               ON CONFLICT(category) DO UPDATE SET
                 content = excluded.content,
                 source = excluded.source,
                 updated_at = datetime('now')""",
            (category, content, source),
        )


def _merge_context(existing: str | None, new_info: str) -> str:
    """기존 정보와 새 정보를 병합합니다. 새 정보가 더 구체적이면 교체, 아니면 보완."""
    if not existing:
        return new_info
    # 새 정보가 기존 정보를 포함하거나 더 길면 교체, 아니면 보완
    if new_info in existing:
        return existing
    if len(new_info) > len(existing) * 0.8:
        return new_info
    # 짧은 보완 정보면 기존에 append
    combined = f"{existing} / {new_info}"
    # 너무 길어지면 새 정보로 교체
    return combined if len(combined) < 200 else new_info


def _extract_from_text(text: str, source: str = "diary") -> None:
    """텍스트에서 개인 컨텍스트를 추출하여 DB에 저장합니다."""
    if not text or len(text.strip()) < 20:
        return

    try:
        from app.ai_client import get_client
        from app.config import get_claude_model

        client = get_client()
        response = client.messages.create(
            model=get_claude_model(),
            max_tokens=512,
            system=EXTRACT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": text[:2000]}],  # 최대 2000자
        )

        raw = response.content[0].text.strip() if hasattr(response.content[0], "text") else ""
        if not raw:
            return

        # JSON 파싱
        # 가끔 ```json ... ``` 형태로 올 수 있어서 정리
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        extracted: dict = json.loads(raw)

        # 기존 컨텍스트와 병합 후 저장
        existing = _get_existing_context()
        for category in CATEGORIES:
            new_val = extracted.get(category)
            if new_val and new_val != "null" and isinstance(new_val, str):
                merged = _merge_context(existing.get(category), new_val)
                _upsert_context(category, merged, source)

        logger.info(f"Personal context updated from {source}")

    except Exception as e:
        logger.warning(f"Context extraction failed: {e}")


def trigger_context_extraction(text: str, source: str = "diary") -> None:
    """
    백그라운드 스레드에서 컨텍스트 추출을 트리거합니다.
    일기 작성 / 일상 이야기 저장 완료 후 호출.
    """
    t = threading.Thread(
        target=_extract_from_text,
        args=(text, source),
        daemon=True,
    )
    t.start()


def get_personal_context_for_prompt() -> str | None:
    """
    system prompt 주입용 개인 컨텍스트 문자열을 반환합니다.
    데이터가 없으면 None 반환.
    """
    ctx = _get_existing_context()
    if not ctx:
        return None

    label = {
        "profession": "직업/분야",
        "family": "가족",
        "interests": "관심사",
        "concerns": "고민",
        "health": "건강",
        "lifestyle": "생활패턴",
    }

    lines = []
    for cat in CATEGORIES:
        if ctx.get(cat):
            lines.append(f"- {label.get(cat, cat)}: {ctx[cat]}")

    return "\n".join(lines) if lines else None
