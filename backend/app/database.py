import sqlite3
from contextlib import contextmanager

from app.config import SQLITE_DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    day_of_week TEXT,
    topic TEXT,
    script_text TEXT,
    questions TEXT,
    status TEXT DEFAULT 'prep',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS smalltalk_scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    day_context TEXT,
    user_input_kr TEXT,
    english_output TEXT,
    conversation_log TEXT,
    key_expressions TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expressions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    expression TEXT NOT NULL,
    meaning TEXT,
    example TEXT,
    source TEXT DEFAULT 'script',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recordings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    transcript_text TEXT,
    duration_seconds INTEGER,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    original TEXT NOT NULL,
    corrected TEXT NOT NULL,
    explanation TEXT,
    error_type TEXT,
    source TEXT DEFAULT 'manual',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drill_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    correction_id INTEGER REFERENCES corrections(id) ON DELETE SET NULL,
    drill_type TEXT NOT NULL,
    question TEXT NOT NULL,
    correct_answer TEXT,
    user_answer TEXT,
    is_completed INTEGER DEFAULT 0,
    feedback TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS error_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_type TEXT NOT NULL UNIQUE,
    description TEXT,
    occurrence_count INTEGER DEFAULT 0,
    last_occurred TEXT,
    example_corrections TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    quiz_type TEXT DEFAULT 'fill_blank',
    user_answer TEXT,
    is_correct INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    korean_input TEXT,
    english_output TEXT,
    pronunciation_tips TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    mode TEXT NOT NULL,
    messages TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(lesson_id, mode)
);

CREATE TABLE IF NOT EXISTS vocab_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expression TEXT NOT NULL,
    meaning TEXT NOT NULL,
    example TEXT,
    note TEXT,
    category TEXT NOT NULL DEFAULT 'word',
    source_lesson_id INTEGER,
    source_context TEXT,
    mastery INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (source_lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS diary_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    user_input TEXT NOT NULL,
    ai_output TEXT,
    memo TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    lesson_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
);
"""


def init_db():
    with get_db() as db:
        db.executescript(SCHEMA)


@contextmanager
def get_db():
    conn = sqlite3.connect(str(SQLITE_DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
