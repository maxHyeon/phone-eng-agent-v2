from pydantic import BaseModel


# --- Lessons ---
class LessonCreate(BaseModel):
    date: str
    day_of_week: str | None = None
    topic: str | None = None
    script_text: str | None = None
    questions: str | None = None


class LessonUpdate(BaseModel):
    topic: str | None = None
    script_text: str | None = None
    questions: str | None = None
    status: str | None = None


class LessonOut(BaseModel):
    id: int
    date: str
    day_of_week: str | None
    topic: str | None
    script_text: str | None
    questions: str | None
    status: str
    created_at: str


# --- Smalltalk ---
class SmalltalkOut(BaseModel):
    id: int
    lesson_id: int
    day_context: str | None
    user_input_kr: str | None
    english_output: str | None
    conversation_log: str | None
    key_expressions: str | None
    created_at: str


# --- Expressions ---
class ExpressionOut(BaseModel):
    id: int
    lesson_id: int
    expression: str
    meaning: str | None
    example: str | None
    source: str
    created_at: str


# --- Recordings ---
class RecordingOut(BaseModel):
    id: int
    lesson_id: int
    file_path: str
    transcript_text: str | None
    duration_seconds: int | None
    status: str
    created_at: str


# --- Corrections ---
class CorrectionCreate(BaseModel):
    original: str
    corrected: str
    explanation: str | None = None
    error_type: str | None = None
    source: str = "manual"


class CorrectionOut(BaseModel):
    id: int
    lesson_id: int
    original: str
    corrected: str
    explanation: str | None
    error_type: str | None
    source: str
    created_at: str


# --- Drills ---
class DrillOut(BaseModel):
    id: int
    lesson_id: int
    correction_id: int | None
    drill_type: str
    question: str
    correct_answer: str | None
    user_answer: str | None
    is_completed: bool
    feedback: str | None
    created_at: str


class DrillToggle(BaseModel):
    is_completed: bool


# --- Error Patterns ---
class ErrorPatternOut(BaseModel):
    id: int
    pattern_type: str
    description: str | None
    occurrence_count: int
    last_occurred: str | None
    example_corrections: str | None
    status: str
    created_at: str
    updated_at: str


# --- Quizzes ---
class QuizOut(BaseModel):
    id: int
    lesson_id: int
    question: str
    answer: str
    quiz_type: str
    user_answer: str | None
    is_correct: bool | None
    created_at: str


class QuizAnswer(BaseModel):
    user_answer: str


# --- Daily Stories ---
class DailyStoryOut(BaseModel):
    id: int
    lesson_id: int
    korean_input: str | None
    english_output: str | None
    pronunciation_tips: str | None
    created_at: str


# --- Review Summary ---
class PolishedExpressionItem(BaseModel):
    id: int
    user_input: str | None
    ai_output: str | None


class KeyExpressionItem(BaseModel):
    id: int
    expression: str
    meaning: str | None
    example: str | None
    source: str


class CorrectionItem(BaseModel):
    id: int
    original: str
    corrected: str
    explanation: str | None
    error_type: str | None


class FailedDrillItem(BaseModel):
    id: int
    drill_type: str
    question: str
    correct_answer: str | None


class ReviewSummaryOut(BaseModel):
    lesson_id: int
    lesson_date: str
    lesson_topic: str | None
    polished_expressions: list[PolishedExpressionItem]
    key_expressions: list[KeyExpressionItem]
    corrections: list[CorrectionItem]
    failed_drills: list[FailedDrillItem]


# --- Vocabulary Book ---
class VocabCreate(BaseModel):
    expression: str
    meaning: str
    example: str | None = None
    note: str | None = None
    category: str = "word"
    source_lesson_id: int | None = None
    source_context: str | None = None


class VocabUpdate(BaseModel):
    expression: str | None = None
    meaning: str | None = None
    example: str | None = None
    note: str | None = None
    category: str | None = None


class VocabOut(BaseModel):
    id: int
    expression: str
    meaning: str
    example: str | None
    note: str | None
    category: str
    source_lesson_id: int | None
    source_context: str | None
    mastery: int
    created_at: str
    updated_at: str


class VocabMasteryUpdate(BaseModel):
    mastery: int


# --- Diary ---
class DiaryCreate(BaseModel):
    date: str
    user_input: str
    memo: str | None = None


class DiaryMemoUpdate(BaseModel):
    memo: str | None = None


class DiaryEntryOut(BaseModel):
    id: int
    date: str
    user_input: str
    ai_output: str | None
    memo: str | None
    source: str
    lesson_id: int | None
    created_at: str
    updated_at: str


# --- Chat ---
# --- Conversation Logs ---
class ConversationSaveRequest(BaseModel):
    conversations: dict[str, list[dict]]


# --- Chat ---
class ChatRequest(BaseModel):
    message: str
    mode: str = "prep"
    lesson_id: int | None = None


class ChatResetRequest(BaseModel):
    lesson_id: int | None = None
    mode: str | None = None
