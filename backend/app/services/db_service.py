import json
from datetime import date, datetime
from pathlib import Path

from app.database import get_db


# ========== Lessons ==========

def create_lesson(data: dict) -> dict:
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO lessons (date, day_of_week, topic, script_text, questions) VALUES (?, ?, ?, ?, ?)",
            (data["date"], data.get("day_of_week"), data.get("topic"), data.get("script_text"), data.get("questions")),
        )
        return dict(db.execute("SELECT * FROM lessons WHERE id = ?", (cur.lastrowid,)).fetchone())


def get_lesson(lesson_id: int) -> dict | None:
    with get_db() as db:
        row = db.execute("SELECT * FROM lessons WHERE id = ?", (lesson_id,)).fetchone()
        return dict(row) if row else None


def get_lessons(date_filter: str | None = None) -> list[dict]:
    with get_db() as db:
        if date_filter:
            rows = db.execute("SELECT * FROM lessons WHERE date = ? ORDER BY id DESC", (date_filter,)).fetchall()
        else:
            rows = db.execute("SELECT * FROM lessons ORDER BY date DESC, id DESC").fetchall()
        return [dict(r) for r in rows]


def get_or_create_today_lesson() -> dict:
    today = date.today().isoformat()
    days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    day_of_week = days[date.today().weekday()]

    with get_db() as db:
        row = db.execute("SELECT * FROM lessons WHERE date = ?", (today,)).fetchone()
        if row:
            return dict(row)
        cur = db.execute(
            "INSERT INTO lessons (date, day_of_week) VALUES (?, ?)",
            (today, day_of_week),
        )
        return dict(db.execute("SELECT * FROM lessons WHERE id = ?", (cur.lastrowid,)).fetchone())


def update_lesson(lesson_id: int, data: dict) -> dict | None:
    fields = {k: v for k, v in data.items() if v is not None}
    if not fields:
        return get_lesson(lesson_id)
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [lesson_id]
    with get_db() as db:
        db.execute(f"UPDATE lessons SET {set_clause} WHERE id = ?", values)
        row = db.execute("SELECT * FROM lessons WHERE id = ?", (lesson_id,)).fetchone()
        return dict(row) if row else None


def delete_lesson(lesson_id: int) -> bool:
    """Delete a lesson and its associated files from disk."""
    with get_db() as db:
        # Get recording file paths before cascade deletes them
        rows = db.execute(
            "SELECT file_path FROM recordings WHERE lesson_id = ?", (lesson_id,)
        ).fetchall()
        file_paths = [row["file_path"] for row in rows]

        # Delete lesson (CASCADE handles all child records)
        cur = db.execute("DELETE FROM lessons WHERE id = ?", (lesson_id,))
        if cur.rowcount == 0:
            return False

    # Remove files from disk after successful DB delete
    for fp in file_paths:
        p = Path(fp)
        if p.exists():
            p.unlink()

    return True


# ========== Smalltalk Scenarios ==========

def save_smalltalk(lesson_id: int, day_context: str, user_input_kr: str | None = None,
                   english_output: str | None = None, conversation_log: str | None = None,
                   key_expressions: str | None = None) -> dict:
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO smalltalk_scenarios (lesson_id, day_context, user_input_kr, english_output, conversation_log, key_expressions) VALUES (?, ?, ?, ?, ?, ?)",
            (lesson_id, day_context, user_input_kr, english_output, conversation_log, key_expressions),
        )
        return dict(db.execute("SELECT * FROM smalltalk_scenarios WHERE id = ?", (cur.lastrowid,)).fetchone())


def get_smalltalks(lesson_id: int) -> list[dict]:
    with get_db() as db:
        rows = db.execute("SELECT * FROM smalltalk_scenarios WHERE lesson_id = ? ORDER BY id DESC", (lesson_id,)).fetchall()
        return [dict(r) for r in rows]


# ========== Expressions ==========

def save_expression(lesson_id: int, expression: str, meaning: str | None = None,
                    example: str | None = None, source: str = "script") -> dict:
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO expressions (lesson_id, expression, meaning, example, source) VALUES (?, ?, ?, ?, ?)",
            (lesson_id, expression, meaning, example, source),
        )
        return dict(db.execute("SELECT * FROM expressions WHERE id = ?", (cur.lastrowid,)).fetchone())


def get_expressions(lesson_id: int | None = None, search: str | None = None) -> list[dict]:
    with get_db() as db:
        if lesson_id:
            rows = db.execute("SELECT * FROM expressions WHERE lesson_id = ? ORDER BY id DESC", (lesson_id,)).fetchall()
        elif search:
            rows = db.execute(
                "SELECT * FROM expressions WHERE expression LIKE ? OR meaning LIKE ? ORDER BY id DESC",
                (f"%{search}%", f"%{search}%"),
            ).fetchall()
        else:
            rows = db.execute("SELECT * FROM expressions ORDER BY id DESC").fetchall()
        return [dict(r) for r in rows]


# ========== Recordings ==========

def save_recording(lesson_id: int, file_path: str, duration_seconds: int | None = None) -> dict:
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO recordings (lesson_id, file_path, duration_seconds) VALUES (?, ?, ?)",
            (lesson_id, file_path, duration_seconds),
        )
        return dict(db.execute("SELECT * FROM recordings WHERE id = ?", (cur.lastrowid,)).fetchone())


def update_recording(recording_id: int, transcript_text: str, status: str = "done") -> dict | None:
    with get_db() as db:
        db.execute(
            "UPDATE recordings SET transcript_text = ?, status = ? WHERE id = ?",
            (transcript_text, status, recording_id),
        )
        row = db.execute("SELECT * FROM recordings WHERE id = ?", (recording_id,)).fetchone()
        return dict(row) if row else None


def get_recordings(lesson_id: int) -> list[dict]:
    with get_db() as db:
        rows = db.execute("SELECT * FROM recordings WHERE lesson_id = ? ORDER BY id DESC", (lesson_id,)).fetchall()
        return [dict(r) for r in rows]


# ========== Corrections ==========

def save_correction(lesson_id: int, original: str, corrected: str,
                    explanation: str | None = None, error_type: str | None = None,
                    source: str = "manual") -> dict:
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO corrections (lesson_id, original, corrected, explanation, error_type, source) VALUES (?, ?, ?, ?, ?, ?)",
            (lesson_id, original, corrected, explanation, error_type, source),
        )
        correction = dict(db.execute("SELECT * FROM corrections WHERE id = ?", (cur.lastrowid,)).fetchone())

    # Update error pattern
    if error_type:
        _update_error_pattern(error_type, correction["id"])

    return correction


def get_corrections(lesson_id: int) -> list[dict]:
    with get_db() as db:
        rows = db.execute("SELECT * FROM corrections WHERE lesson_id = ? ORDER BY id DESC", (lesson_id,)).fetchall()
        return [dict(r) for r in rows]


def _update_error_pattern(error_type: str, correction_id: int):
    today = date.today().isoformat()
    with get_db() as db:
        row = db.execute("SELECT * FROM error_patterns WHERE pattern_type = ?", (error_type,)).fetchone()
        if row:
            existing = json.loads(row["example_corrections"] or "[]")
            existing.append(correction_id)
            db.execute(
                "UPDATE error_patterns SET occurrence_count = occurrence_count + 1, last_occurred = ?, example_corrections = ?, updated_at = ? WHERE id = ?",
                (today, json.dumps(existing), datetime.now().isoformat(), row["id"]),
            )
        else:
            db.execute(
                "INSERT INTO error_patterns (pattern_type, occurrence_count, last_occurred, example_corrections) VALUES (?, 1, ?, ?)",
                (error_type, today, json.dumps([correction_id])),
            )


# ========== Drills ==========

def save_drill(lesson_id: int, correction_id: int | None, drill_type: str,
               question: str, correct_answer: str | None = None) -> dict:
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO drill_sessions (lesson_id, correction_id, drill_type, question, correct_answer) VALUES (?, ?, ?, ?, ?)",
            (lesson_id, correction_id, drill_type, question, correct_answer),
        )
        return dict(db.execute("SELECT * FROM drill_sessions WHERE id = ?", (cur.lastrowid,)).fetchone())


def get_drills(lesson_id: int) -> list[dict]:
    with get_db() as db:
        rows = db.execute("SELECT * FROM drill_sessions WHERE lesson_id = ? ORDER BY id", (lesson_id,)).fetchall()
        return [dict(r) for r in rows]


def toggle_drill(drill_id: int, is_completed: bool) -> dict | None:
    with get_db() as db:
        db.execute("UPDATE drill_sessions SET is_completed = ? WHERE id = ?", (int(is_completed), drill_id))
        row = db.execute("SELECT * FROM drill_sessions WHERE id = ?", (drill_id,)).fetchone()
        return dict(row) if row else None


# ========== Error Patterns ==========

def get_error_patterns() -> list[dict]:
    with get_db() as db:
        rows = db.execute("SELECT * FROM error_patterns ORDER BY occurrence_count DESC").fetchall()
        return [dict(r) for r in rows]


def get_error_stats() -> dict:
    """Get aggregated error statistics for analytics."""
    with get_db() as db:
        # Error type distribution
        type_rows = db.execute(
            "SELECT error_type, COUNT(*) as count FROM corrections WHERE error_type IS NOT NULL GROUP BY error_type ORDER BY count DESC"
        ).fetchall()

        # Error trend by date
        trend_rows = db.execute(
            "SELECT l.date, c.error_type, COUNT(*) as count "
            "FROM corrections c JOIN lessons l ON c.lesson_id = l.id "
            "WHERE c.error_type IS NOT NULL "
            "GROUP BY l.date, c.error_type ORDER BY l.date"
        ).fetchall()

        # Total stats
        total = db.execute("SELECT COUNT(*) as total FROM corrections").fetchone()
        lesson_count = db.execute("SELECT COUNT(*) as total FROM lessons").fetchone()

        return {
            "type_distribution": [dict(r) for r in type_rows],
            "trend": [dict(r) for r in trend_rows],
            "total_corrections": total["total"],
            "total_lessons": lesson_count["total"],
        }


# ========== Quizzes ==========

def save_quiz(lesson_id: int, question: str, answer: str, quiz_type: str = "fill_blank") -> dict:
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO quizzes (lesson_id, question, answer, quiz_type) VALUES (?, ?, ?, ?)",
            (lesson_id, question, answer, quiz_type),
        )
        return dict(db.execute("SELECT * FROM quizzes WHERE id = ?", (cur.lastrowid,)).fetchone())


def get_quizzes(lesson_id: int) -> list[dict]:
    with get_db() as db:
        rows = db.execute("SELECT * FROM quizzes WHERE lesson_id = ? ORDER BY id", (lesson_id,)).fetchall()
        return [dict(r) for r in rows]


def answer_quiz(quiz_id: int, user_answer: str) -> dict | None:
    with get_db() as db:
        row = db.execute("SELECT * FROM quizzes WHERE id = ?", (quiz_id,)).fetchone()
        if not row:
            return None
        is_correct = int(user_answer.strip().lower() == row["answer"].strip().lower())
        db.execute(
            "UPDATE quizzes SET user_answer = ?, is_correct = ? WHERE id = ?",
            (user_answer, is_correct, quiz_id),
        )
        return dict(db.execute("SELECT * FROM quizzes WHERE id = ?", (quiz_id,)).fetchone())


# ========== Daily Stories ==========

# ========== Conversation Logs ==========

def save_conversation_logs(lesson_id: int, conversations: dict[str, list[dict]]) -> None:
    with get_db() as db:
        for mode, messages in conversations.items():
            db.execute(
                """INSERT INTO conversation_logs (lesson_id, mode, messages, updated_at)
                   VALUES (?, ?, ?, datetime('now'))
                   ON CONFLICT(lesson_id, mode) DO UPDATE SET messages = excluded.messages, updated_at = datetime('now')""",
                (lesson_id, mode, json.dumps(messages, ensure_ascii=False)),
            )


def get_conversation_logs(lesson_id: int) -> dict[str, list[dict]]:
    with get_db() as db:
        rows = db.execute(
            "SELECT mode, messages FROM conversation_logs WHERE lesson_id = ?",
            (lesson_id,),
        ).fetchall()
        return {row["mode"]: json.loads(row["messages"]) for row in rows}


# ========== Daily Stories ==========

def save_daily_story(lesson_id: int, korean_input: str, english_output: str,
                     pronunciation_tips: str | None = None) -> dict:
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO daily_stories (lesson_id, korean_input, english_output, pronunciation_tips) VALUES (?, ?, ?, ?)",
            (lesson_id, korean_input, english_output, pronunciation_tips),
        )
        return dict(db.execute("SELECT * FROM daily_stories WHERE id = ?", (cur.lastrowid,)).fetchone())


# ========== Previous Lesson Review ==========

def get_previous_lesson(current_lesson_id: int) -> dict | None:
    """Get the most recent lesson before the given lesson that has learning data."""
    with get_db() as db:
        row = db.execute(
            """SELECT l.* FROM lessons l
               WHERE l.id < ?
                 AND (EXISTS (SELECT 1 FROM daily_stories WHERE lesson_id = l.id)
                   OR EXISTS (SELECT 1 FROM smalltalk_scenarios WHERE lesson_id = l.id)
                   OR EXISTS (SELECT 1 FROM corrections WHERE lesson_id = l.id)
                   OR EXISTS (SELECT 1 FROM expressions WHERE lesson_id = l.id))
               ORDER BY l.id DESC LIMIT 1""",
            (current_lesson_id,),
        ).fetchone()
        return dict(row) if row else None


def get_review_summary(lesson_id: int) -> dict:
    """Aggregate review data for a lesson: polished expressions, key expressions, corrections, failed drills."""
    with get_db() as db:
        # A. Polished expressions from daily_stories + smalltalk_scenarios
        daily_stories = db.execute(
            "SELECT id, korean_input, english_output FROM daily_stories WHERE lesson_id = ? ORDER BY id",
            (lesson_id,),
        ).fetchall()

        smalltalks = db.execute(
            "SELECT id, user_input_kr, english_output FROM smalltalk_scenarios WHERE lesson_id = ? AND english_output IS NOT NULL ORDER BY id",
            (lesson_id,),
        ).fetchall()

        polished = []
        for r in daily_stories:
            polished.append({"id": r["id"], "user_input": r["korean_input"], "ai_output": r["english_output"]})
        for r in smalltalks:
            polished.append({"id": r["id"] + 100000, "user_input": r["user_input_kr"], "ai_output": r["english_output"]})

        # B. Key expressions
        expressions = db.execute(
            "SELECT id, expression, meaning, example, source FROM expressions WHERE lesson_id = ? ORDER BY id",
            (lesson_id,),
        ).fetchall()

        # C. Corrections
        corrections = db.execute(
            "SELECT id, original, corrected, explanation, error_type FROM corrections WHERE lesson_id = ? ORDER BY id",
            (lesson_id,),
        ).fetchall()

        # D. Failed drills
        failed_drills = db.execute(
            "SELECT id, drill_type, question, correct_answer FROM drill_sessions WHERE lesson_id = ? AND is_completed = 0 ORDER BY id",
            (lesson_id,),
        ).fetchall()

        # Get lesson info
        lesson = db.execute("SELECT date, topic FROM lessons WHERE id = ?", (lesson_id,)).fetchone()

        return {
            "lesson_id": lesson_id,
            "lesson_date": lesson["date"] if lesson else "",
            "lesson_topic": lesson["topic"] if lesson else None,
            "polished_expressions": polished,
            "key_expressions": [dict(r) for r in expressions],
            "corrections": [dict(r) for r in corrections],
            "failed_drills": [dict(r) for r in failed_drills],
        }


# ========== Vocabulary Book ==========

def create_vocab(data: dict) -> dict:
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO vocab_entries (expression, meaning, example, note, category, source_lesson_id, source_context) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (data["expression"], data["meaning"], data.get("example"), data.get("note"),
             data.get("category", "word"), data.get("source_lesson_id"), data.get("source_context")),
        )
        return dict(db.execute("SELECT * FROM vocab_entries WHERE id = ?", (cur.lastrowid,)).fetchone())


def get_vocabs(category: str | None = None, search: str | None = None, sort: str = "newest") -> list[dict]:
    with get_db() as db:
        query = "SELECT * FROM vocab_entries WHERE 1=1"
        params: list = []

        if category:
            query += " AND category = ?"
            params.append(category)

        if search:
            query += " AND (expression LIKE ? OR meaning LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])

        if sort == "oldest":
            query += " ORDER BY created_at ASC"
        elif sort == "mastery_asc":
            query += " ORDER BY mastery ASC, created_at DESC"
        elif sort == "mastery_desc":
            query += " ORDER BY mastery DESC, created_at DESC"
        else:
            query += " ORDER BY created_at DESC"

        rows = db.execute(query, params).fetchall()
        return [dict(r) for r in rows]


def get_vocab(vocab_id: int) -> dict | None:
    with get_db() as db:
        row = db.execute("SELECT * FROM vocab_entries WHERE id = ?", (vocab_id,)).fetchone()
        return dict(row) if row else None


def update_vocab(vocab_id: int, data: dict) -> dict | None:
    with get_db() as db:
        existing = db.execute("SELECT * FROM vocab_entries WHERE id = ?", (vocab_id,)).fetchone()
        if not existing:
            return None
        fields = []
        values = []
        for key in ("expression", "meaning", "example", "note", "category"):
            if key in data:
                fields.append(f"{key} = ?")
                values.append(data[key])
        if fields:
            fields.append("updated_at = datetime('now')")
            values.append(vocab_id)
            db.execute(f"UPDATE vocab_entries SET {', '.join(fields)} WHERE id = ?", values)
        return dict(db.execute("SELECT * FROM vocab_entries WHERE id = ?", (vocab_id,)).fetchone())


def delete_vocab(vocab_id: int) -> bool:
    with get_db() as db:
        cur = db.execute("DELETE FROM vocab_entries WHERE id = ?", (vocab_id,))
        return cur.rowcount > 0


def update_vocab_mastery(vocab_id: int, mastery: int) -> dict | None:
    with get_db() as db:
        existing = db.execute("SELECT * FROM vocab_entries WHERE id = ?", (vocab_id,)).fetchone()
        if not existing:
            return None
        db.execute(
            "UPDATE vocab_entries SET mastery = ?, updated_at = datetime('now') WHERE id = ?",
            (mastery, vocab_id),
        )
        return dict(db.execute("SELECT * FROM vocab_entries WHERE id = ?", (vocab_id,)).fetchone())


def get_vocab_flashcards(category: str | None = None) -> list[dict]:
    """Get vocab entries sorted by mastery ASC (least mastered first). Excludes mastered (mastery >= 3)."""
    with get_db() as db:
        query = "SELECT * FROM vocab_entries WHERE mastery < 3"
        params: list = []
        if category:
            query += " AND category = ?"
            params.append(category)
        query += " ORDER BY mastery ASC, RANDOM()"
        rows = db.execute(query, params).fetchall()
        return [dict(r) for r in rows]


# ========== Diary ==========

def get_diary_dates(year: int, month: int) -> list[str]:
    """Get dates that have diary entries (manual + lesson-based) for a given month."""
    start = f"{year:04d}-{month:02d}-01"
    if month == 12:
        end = f"{year + 1:04d}-01-01"
    else:
        end = f"{year:04d}-{month + 1:02d}-01"

    with get_db() as db:
        # Manual diary entries
        diary_dates = db.execute(
            "SELECT DISTINCT date FROM diary_entries WHERE date >= ? AND date < ?",
            (start, end),
        ).fetchall()

        # Lesson-based entries (daily_stories or smalltalk_scenarios)
        lesson_dates = db.execute(
            """SELECT DISTINCT l.date FROM lessons l
               WHERE l.date >= ? AND l.date < ?
                 AND (EXISTS (SELECT 1 FROM daily_stories WHERE lesson_id = l.id)
                   OR EXISTS (SELECT 1 FROM smalltalk_scenarios WHERE lesson_id = l.id AND english_output IS NOT NULL))""",
            (start, end),
        ).fetchall()

        all_dates = set(r["date"] for r in diary_dates) | set(r["date"] for r in lesson_dates)
        return sorted(all_dates)


def get_diary_by_date(date: str) -> list[dict]:
    """Get all diary entries for a specific date (manual + lesson-based), sorted by created_at."""
    with get_db() as db:
        # Manual diary entries
        manual = db.execute(
            "SELECT * FROM diary_entries WHERE date = ? ORDER BY created_at",
            (date,),
        ).fetchall()
        entries = [dict(r) for r in manual]

        # Lesson-based: daily_stories
        stories = db.execute(
            """SELECT ds.id, ds.korean_input, ds.english_output, ds.created_at, l.id as lesson_id
               FROM daily_stories ds
               JOIN lessons l ON ds.lesson_id = l.id
               WHERE l.date = ?
               ORDER BY ds.id""",
            (date,),
        ).fetchall()
        for r in stories:
            entries.append({
                "id": r["id"] + 1000000,
                "date": date,
                "user_input": r["korean_input"],
                "ai_output": r["english_output"],
                "memo": None,
                "source": "lesson",
                "lesson_id": r["lesson_id"],
                "created_at": r["created_at"],
                "updated_at": r["created_at"],
            })

        # Lesson-based: smalltalk_scenarios
        smalltalks = db.execute(
            """SELECT st.id, st.user_input_kr, st.english_output, st.created_at, l.id as lesson_id
               FROM smalltalk_scenarios st
               JOIN lessons l ON st.lesson_id = l.id
               WHERE l.date = ? AND st.english_output IS NOT NULL
               ORDER BY st.id""",
            (date,),
        ).fetchall()
        for r in smalltalks:
            entries.append({
                "id": r["id"] + 2000000,
                "date": date,
                "user_input": r["user_input_kr"],
                "ai_output": r["english_output"],
                "memo": None,
                "source": "lesson",
                "lesson_id": r["lesson_id"],
                "created_at": r["created_at"],
                "updated_at": r["created_at"],
            })

        # Sort all by created_at
        entries.sort(key=lambda e: e.get("created_at", ""))
        return entries


def create_diary_entry(date: str, user_input: str, ai_output: str | None = None,
                       memo: str | None = None) -> dict:
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO diary_entries (date, user_input, ai_output, memo, source) VALUES (?, ?, ?, ?, 'manual')",
            (date, user_input, ai_output, memo),
        )
        return dict(db.execute("SELECT * FROM diary_entries WHERE id = ?", (cur.lastrowid,)).fetchone())


def update_diary_memo(diary_id: int, memo: str | None) -> dict | None:
    with get_db() as db:
        existing = db.execute("SELECT * FROM diary_entries WHERE id = ?", (diary_id,)).fetchone()
        if not existing:
            return None
        db.execute(
            "UPDATE diary_entries SET memo = ?, updated_at = datetime('now') WHERE id = ?",
            (memo, diary_id),
        )
        return dict(db.execute("SELECT * FROM diary_entries WHERE id = ?", (diary_id,)).fetchone())


def delete_diary_entry(diary_id: int) -> bool:
    with get_db() as db:
        cur = db.execute("DELETE FROM diary_entries WHERE id = ? AND source = 'manual'", (diary_id,))
        return cur.rowcount > 0
