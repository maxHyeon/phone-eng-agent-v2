"""
profile_service.py
==================
SQL 집계 기반 학습자 프로필 자동 업데이트 서비스.

LLM 호출 없이 순수 DB 집계로 프로필을 생성합니다.
polish_english, extract_corrections 도구 완료 시 자동으로 호출됩니다.

프로필 갱신 조건 (불필요한 write 방지):
- 마지막 프로필 생성 이후 corrections 또는 daily_stories 변경이 있을 때만 갱신
"""

import json
import threading
from datetime import date, timedelta

from app.database import get_db


def _compute_profile() -> dict:
    """DB 집계로 학습자 프로필 데이터를 계산합니다. LLM 호출 없음."""
    with get_db() as db:

        # ── 1. 오류 유형 분포 (전체 누적) ──────────────────────────────
        type_rows = db.execute(
            """SELECT error_type, COUNT(*) as cnt
               FROM corrections
               WHERE error_type IS NOT NULL
               GROUP BY error_type
               ORDER BY cnt DESC""",
        ).fetchall()
        total_corrections = sum(r["cnt"] for r in type_rows) or 1

        top_errors = [
            {
                "type": r["error_type"],
                "count": r["cnt"],
                "pct": round(r["cnt"] / total_corrections * 100, 1),
            }
            for r in type_rows[:5]
        ]
        weak_areas = [r["error_type"] for r in type_rows[:3]]

        # ── 2. 강점 영역 (최근 4주 오류 비율이 낮은 유형) ──────────────
        four_weeks_ago = (date.today() - timedelta(weeks=4)).isoformat()
        recent_type_rows = db.execute(
            """SELECT c.error_type, COUNT(*) as cnt
               FROM corrections c
               JOIN lessons l ON c.lesson_id = l.id
               WHERE c.error_type IS NOT NULL AND l.date >= ?
               GROUP BY c.error_type""",
            (four_weeks_ago,),
        ).fetchall()
        recent_error_types = {r["error_type"] for r in recent_type_rows}
        all_types = {"tense", "preposition", "article", "word_order",
                     "word_choice", "pronunciation", "grammar"}
        strong_areas = sorted(all_types - recent_error_types)[:3]

        # ── 3. 최근 수업 토픽 ─────────────────────────────────────────
        topic_rows = db.execute(
            """SELECT topic FROM lessons
               WHERE topic IS NOT NULL AND topic != ''
               ORDER BY date DESC LIMIT 5""",
        ).fetchall()
        recent_topics = [r["topic"] for r in topic_rows]

        # ── 4. 단어장 통계 ────────────────────────────────────────────
        vocab_row = db.execute(
            """SELECT
                 COUNT(*) as total,
                 SUM(CASE WHEN mastery >= 3 THEN 1 ELSE 0 END) as mastered,
                 SUM(CASE WHEN mastery < 3 THEN 1 ELSE 0 END) as learning
               FROM vocab_entries""",
        ).fetchone()
        vocab_stats = {
            "total": vocab_row["total"] or 0,
            "mastered": vocab_row["mastered"] or 0,
            "learning": vocab_row["learning"] or 0,
        }

        # ── 5. 연속 수업 일수 (streak) ────────────────────────────────
        lesson_dates_rows = db.execute(
            "SELECT DISTINCT date FROM lessons ORDER BY date DESC LIMIT 30",
        ).fetchall()
        lesson_dates = [r["date"] for r in lesson_dates_rows]
        streak = _calc_streak(lesson_dates)

        # ── 6. 수업 수 & 총 교정 수 ───────────────────────────────────
        lesson_count = db.execute("SELECT COUNT(*) as n FROM lessons").fetchone()["n"]
        corrections_total = db.execute("SELECT COUNT(*) as n FROM corrections").fetchone()["n"]

    # ── 7. 요약 텍스트 생성 (LLM 없이 템플릿) ─────────────────────────
    summary = _build_summary(
        top_errors=top_errors,
        weak_areas=weak_areas,
        vocab_stats=vocab_stats,
        lesson_count=lesson_count,
        corrections_total=corrections_total,
        streak=streak,
    )
    coaching_notes = _build_coaching_notes(top_errors, vocab_stats)

    return {
        "profile_type": "auto",
        "top_errors": top_errors,
        "weak_areas": weak_areas,
        "strong_areas": strong_areas,
        "recent_topics": recent_topics,
        "vocab_stats": vocab_stats,
        "lesson_streak": streak,
        "summary": summary,
        "coaching_notes": coaching_notes,
    }


def _calc_streak(sorted_dates_desc: list[str]) -> int:
    """내림차순 날짜 목록에서 오늘부터 연속 수업 일수를 계산합니다."""
    if not sorted_dates_desc:
        return 0
    today = date.today()
    streak = 0
    for i, d_str in enumerate(sorted_dates_desc):
        d = date.fromisoformat(d_str)
        expected = today - timedelta(days=i)
        if d == expected:
            streak += 1
        else:
            break
    return streak


def _build_summary(top_errors, weak_areas, vocab_stats,
                   lesson_count, corrections_total, streak) -> str:
    parts = []
    if top_errors:
        top = top_errors[0]
        parts.append(
            f"총 {lesson_count}회 수업, {corrections_total}건 교정 누적. "
            f"가장 빈발 오류는 {top['type']}({top['pct']}%)입니다."
        )
    else:
        parts.append(f"총 {lesson_count}회 수업을 완료했습니다.")

    if vocab_stats["total"] > 0:
        parts.append(
            f"단어장 {vocab_stats['total']}개 중 "
            f"{vocab_stats['mastered']}개 숙달 / "
            f"{vocab_stats['learning']}개 학습 중입니다."
        )
    if streak > 1:
        parts.append(f"{streak}일 연속 수업 중입니다.")

    return " ".join(parts)


def _build_coaching_notes(top_errors, vocab_stats) -> str:
    notes = []
    if top_errors:
        top3 = [e["type"] for e in top_errors[:3]]
        notes.append(f"수업 중 {', '.join(top3)} 오류에 집중해서 교정하세요.")
    if vocab_stats.get("learning", 0) > 20:
        notes.append("미숙달 단어가 많으므로 수업 전 get_unmastered_vocab으로 복습 기회를 만드세요.")
    return " ".join(notes) if notes else "정기적인 복습을 유지하세요."


def _should_update() -> bool:
    """마지막 프로필 이후 새 교정 또는 스토리가 있으면 True."""
    with get_db() as db:
        profile_row = db.execute(
            "SELECT created_at FROM learner_profiles ORDER BY id DESC LIMIT 1"
        ).fetchone()

        if not profile_row:
            return True  # 프로필 없으면 무조건 생성

        last_ts = profile_row["created_at"]

        new_corrections = db.execute(
            "SELECT COUNT(*) as n FROM corrections WHERE created_at > ?",
            (last_ts,),
        ).fetchone()["n"]

        new_stories = db.execute(
            "SELECT COUNT(*) as n FROM daily_stories WHERE created_at > ?",
            (last_ts,),
        ).fetchone()["n"]

        return (new_corrections + new_stories) > 0


def _do_update():
    """실제 프로필 계산 후 DB upsert. 백그라운드 스레드에서 호출됩니다."""
    try:
        if not _should_update():
            return

        profile = _compute_profile()

        with get_db() as db:
            db.execute(
                """INSERT INTO learner_profiles
                   (profile_type, top_errors, weak_areas, strong_areas, recent_topics,
                    vocab_stats, lesson_streak, summary, coaching_notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    profile["profile_type"],
                    json.dumps(profile["top_errors"], ensure_ascii=False),
                    json.dumps(profile["weak_areas"], ensure_ascii=False),
                    json.dumps(profile["strong_areas"], ensure_ascii=False),
                    json.dumps(profile["recent_topics"], ensure_ascii=False),
                    json.dumps(profile["vocab_stats"], ensure_ascii=False),
                    profile["lesson_streak"],
                    profile["summary"],
                    profile["coaching_notes"],
                ),
            )
    except Exception as e:
        # 프로필 업데이트 실패가 주 요청을 방해해서는 안 됨
        import logging
        logging.getLogger(__name__).warning(f"Profile update failed: {e}")


def trigger_profile_update():
    """
    비동기로 프로필 갱신을 트리거합니다.
    도구 핸들러에서 결과 반환 후 호출 — 주 요청 latency에 영향 없음.
    """
    t = threading.Thread(target=_do_update, daemon=True)
    t.start()
