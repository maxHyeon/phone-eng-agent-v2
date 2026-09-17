import json

from app.services import db_service
from app.services.whisper_service import transcribe_file
from app.services.profile_service import trigger_profile_update
from app.services.context_extractor_service import trigger_context_extraction

# ========== Tool Definitions ==========

TOOL_DEFINITIONS = [
    {
        "name": "generate_smalltalk_scenario",
        "description": "요일/컨텍스트 기반 스몰톡 시나리오를 생성하고 저장합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "lesson_id": {"type": "integer", "description": "수업 ID"},
                "day_context": {"type": "string", "description": "요일 컨텍스트 (monday/wednesday/friday/holiday/custom)"},
                "user_input_kr": {"type": "string", "description": "사용자가 한국어로 입력한 이야기"},
                "english_output": {"type": "string", "description": "영어로 변환된 대화"},
                "key_expressions": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "핵심 표현 목록",
                },
            },
            "required": ["lesson_id", "day_context"],
        },
    },
    {
        "name": "polish_english",
        "description": "한국어나 거친 영어를 자연스러운 영어로 다듬어줍니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "lesson_id": {"type": "integer", "description": "수업 ID"},
                "original_input": {"type": "string", "description": "원본 (한국어 또는 거친 영어)"},
                "polished_english": {"type": "string", "description": "다듬어진 영어"},
                "key_expressions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "expression": {"type": "string"},
                            "pronunciation": {"type": "string"},
                        },
                    },
                    "description": "핵심 표현과 발음 가이드",
                },
                "alternative_phrasings": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "대안 표현들",
                },
            },
            "required": ["lesson_id", "original_input", "polished_english"],
        },
    },
    {
        "name": "analyze_script",
        "description": "뉴스 기사/스크립트에서 핵심 표현을 추출합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "lesson_id": {"type": "integer", "description": "수업 ID"},
                "expressions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "expression": {"type": "string"},
                            "meaning": {"type": "string"},
                            "example": {"type": "string"},
                        },
                        "required": ["expression", "meaning"],
                    },
                    "description": "추출된 핵심 표현 목록",
                },
            },
            "required": ["lesson_id", "expressions"],
        },
    },
    {
        "name": "explain_expression",
        "description": "표현을 상세히 설명합니다 (의미, 예문, 발음).",
        "input_schema": {
            "type": "object",
            "properties": {
                "lesson_id": {"type": "integer", "description": "수업 ID"},
                "expression": {"type": "string", "description": "표현"},
                "meaning": {"type": "string", "description": "한국어 의미"},
                "english_definition": {"type": "string", "description": "영어 정의"},
                "examples": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "예문 목록",
                },
                "pronunciation_tip": {"type": "string", "description": "한국어 발음 가이드"},
            },
            "required": ["lesson_id", "expression", "meaning"],
        },
    },
    {
        "name": "transcribe_audio",
        "description": "녹음 파일을 텍스트로 전사합니다. 이미 업로드된 녹음의 recording_id를 전달합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "recording_id": {"type": "integer", "description": "녹음 레코드 ID"},
            },
            "required": ["recording_id"],
        },
    },
    {
        "name": "extract_corrections",
        "description": "텍스트에서 오류를 추출하고 교정합니다. 오류 유형을 분류합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "lesson_id": {"type": "integer", "description": "수업 ID"},
                "corrections": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "original": {"type": "string", "description": "틀린 표현"},
                            "corrected": {"type": "string", "description": "올바른 표현"},
                            "explanation": {"type": "string", "description": "설명"},
                            "error_type": {
                                "type": "string",
                                "enum": ["tense", "preposition", "article", "word_order", "word_choice", "pronunciation", "grammar", "other"],
                                "description": "오류 유형",
                            },
                        },
                        "required": ["original", "corrected", "explanation", "error_type"],
                    },
                    "description": "교정 목록",
                },
                "source": {
                    "type": "string",
                    "enum": ["transcript", "feedback", "manual"],
                    "description": "교정 출처",
                },
            },
            "required": ["lesson_id", "corrections"],
        },
    },
    {
        "name": "generate_drill",
        "description": "오류 기반 문장 구조 드릴을 생성합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "lesson_id": {"type": "integer", "description": "수업 ID"},
                "drills": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "correction_id": {"type": "integer", "description": "관련 교정 ID"},
                            "drill_type": {
                                "type": "string",
                                "enum": ["fill_blank", "transform", "find_error", "free_write"],
                                "description": "드릴 유형",
                            },
                            "question": {"type": "string", "description": "드릴 문제"},
                            "correct_answer": {"type": "string", "description": "정답"},
                        },
                        "required": ["drill_type", "question"],
                    },
                    "description": "드릴 문제 목록",
                },
            },
            "required": ["lesson_id", "drills"],
        },
    },
    {
        "name": "evaluate_drill_answer",
        "description": "드릴 답변을 평가하고 피드백을 제공합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "drill_id": {"type": "integer", "description": "드릴 ID"},
                "user_answer": {"type": "string", "description": "사용자 답변"},
                "is_correct": {"type": "boolean", "description": "정답 여부"},
                "feedback": {"type": "string", "description": "피드백"},
            },
            "required": ["drill_id", "user_answer", "is_correct", "feedback"],
        },
    },
    {
        "name": "generate_quiz",
        "description": "복습 퀴즈를 생성합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "lesson_id": {"type": "integer", "description": "수업 ID"},
                "quizzes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "question": {"type": "string"},
                            "answer": {"type": "string"},
                            "quiz_type": {
                                "type": "string",
                                "enum": ["fill_blank", "usage", "translation"],
                            },
                        },
                        "required": ["question", "answer"],
                    },
                    "description": "퀴즈 목록",
                },
            },
            "required": ["lesson_id", "quizzes"],
        },
    },
    {
        "name": "analyze_error_patterns",
        "description": "누적 오류 패턴을 분석하고 리포트를 생성합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "analysis_type": {
                    "type": "string",
                    "enum": ["weekly", "monthly", "all"],
                    "description": "분석 범위",
                },
            },
            "required": ["analysis_type"],
        },
    },
    {
        "name": "save_learner_profile",
        "description": "학습자의 누적 데이터를 분석하여 학습 프로필을 생성하고 저장합니다. analytics 모드에서 분석 완료 후 호출하세요.",
        "input_schema": {
            "type": "object",
            "properties": {
                "top_errors": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string"},
                            "count": {"type": "integer"},
                            "pct": {"type": "number"},
                        },
                    },
                    "description": "오류 유형별 빈도 (상위 5개)",
                },
                "weak_areas": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "약점 영역 목록 (예: ['tense', 'preposition'])",
                },
                "strong_areas": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "강점 영역 목록",
                },
                "recent_topics": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "최근 수업 토픽 목록",
                },
                "vocab_stats": {
                    "type": "object",
                    "properties": {
                        "total": {"type": "integer"},
                        "mastered": {"type": "integer"},
                        "learning": {"type": "integer"},
                    },
                    "description": "단어장 통계",
                },
                "lesson_streak": {
                    "type": "integer",
                    "description": "연속 수업 일수",
                },
                "summary": {
                    "type": "string",
                    "description": "학습자 현황 요약 (한국어 2~3문장, 다음 수업 AI가 읽을 내용)",
                },
                "coaching_notes": {
                    "type": "string",
                    "description": "코칭 힌트 (예: '시제 오류가 잦으므로 수업 중 시제 교정에 집중할 것')",
                },
            },
            "required": ["top_errors", "weak_areas", "summary", "coaching_notes"],
        },
    },
    {
        "name": "get_recurring_errors",
        "description": "과거 수업에서 반복된 오류 패턴을 조회합니다. 학습자가 자주 틀리는 표현을 수업 전/후에 참고하세요.",
        "input_schema": {
            "type": "object",
            "properties": {
                "error_type": {
                    "type": "string",
                    "enum": ["tense", "preposition", "article", "word_order", "word_choice", "pronunciation", "grammar", "other"],
                    "description": "조회할 오류 유형 (없으면 전체 조회)",
                },
                "limit": {
                    "type": "integer",
                    "description": "조회 건수 (기본 5)",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_related_expressions",
        "description": "오늘 수업 토픽과 관련하여 과거에 학습한 표현을 조회합니다. 기사 분석이나 프리토킹 전에 활용하세요.",
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "description": "검색 키워드 (오늘 수업 토픽 또는 기사 주제)",
                },
                "limit": {
                    "type": "integer",
                    "description": "조회 건수 (기본 8)",
                },
            },
            "required": ["topic"],
        },
    },
    {
        "name": "get_unmastered_vocab",
        "description": "아직 숙달되지 않은 단어장 항목을 조회합니다. 수업 전 복습 또는 드릴 생성에 활용하세요.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "조회 건수 (기본 10)",
                },
            },
            "required": [],
        },
    },
    {
        "name": "get_recent_diary",
        "description": "최근 일기를 조회합니다. 스몰톡 소재 발굴이나 학습자 근황 파악에 활용하세요.",
        "input_schema": {
            "type": "object",
            "properties": {
                "days": {
                    "type": "integer",
                    "description": "최근 며칠치 조회 (기본 7)",
                },
                "limit": {
                    "type": "integer",
                    "description": "조회 건수 (기본 5)",
                },
            },
            "required": [],
        },
    },
]

# Mode → available tools
MODE_TOOLS = {
    "prep": {"generate_smalltalk_scenario", "polish_english", "analyze_script", "explain_expression",
             "get_recurring_errors", "get_related_expressions", "get_unmastered_vocab", "get_recent_diary"},
    "review": {"transcribe_audio", "extract_corrections", "generate_drill", "evaluate_drill_answer", "generate_quiz",
               "get_recurring_errors"},
    "analytics": {"analyze_error_patterns", "save_learner_profile",
                  "get_recurring_errors", "get_unmastered_vocab", "get_recent_diary"},
}


def get_tools_for_mode(mode: str) -> list[dict]:
    base_mode = mode.split(":")[0]
    allowed = MODE_TOOLS.get(base_mode, set())
    return [t for t in TOOL_DEFINITIONS if t["name"] in allowed]


# ========== Tool Handlers ==========

def _handle_generate_smalltalk_scenario(input_data: dict) -> str:
    result = db_service.save_smalltalk(
        lesson_id=input_data["lesson_id"],
        day_context=input_data["day_context"],
        user_input_kr=input_data.get("user_input_kr"),
        english_output=input_data.get("english_output"),
        key_expressions=json.dumps(input_data.get("key_expressions", []), ensure_ascii=False),
    )
    return json.dumps({"saved": True, "id": result["id"]}, ensure_ascii=False)


def _handle_polish_english(input_data: dict) -> str:
    db_service.save_daily_story(
        lesson_id=input_data["lesson_id"],
        korean_input=input_data["original_input"],
        english_output=input_data["polished_english"],
        pronunciation_tips=json.dumps(input_data.get("key_expressions", []), ensure_ascii=False),
    )
    # 일상 이야기 저장 완료 → 프로필 자동 갱신 (백그라운드, latency 없음)
    trigger_profile_update()
    # 개인 컨텍스트 추출 (직업/가족/관심사 등) — 백그라운드
    trigger_context_extraction(input_data["original_input"], source="daily_story")
    return json.dumps({
        "polished": input_data["polished_english"],
        "alternatives": input_data.get("alternative_phrasings", []),
        "key_expressions": input_data.get("key_expressions", []),
    }, ensure_ascii=False)


def _handle_analyze_script(input_data: dict) -> str:
    saved = []
    for expr in input_data["expressions"]:
        result = db_service.save_expression(
            lesson_id=input_data["lesson_id"],
            expression=expr["expression"],
            meaning=expr.get("meaning"),
            example=expr.get("example"),
            source="script",
        )
        saved.append(result)
    return json.dumps({"count": len(saved), "expressions": [s["expression"] for s in saved]}, ensure_ascii=False)


def _handle_explain_expression(input_data: dict) -> str:
    db_service.save_expression(
        lesson_id=input_data["lesson_id"],
        expression=input_data["expression"],
        meaning=input_data["meaning"],
        example="; ".join(input_data.get("examples", [])),
        source="conversation",
    )
    return json.dumps({
        "expression": input_data["expression"],
        "meaning": input_data["meaning"],
        "definition": input_data.get("english_definition"),
        "examples": input_data.get("examples", []),
        "pronunciation": input_data.get("pronunciation_tip"),
    }, ensure_ascii=False)


def _handle_transcribe_audio(input_data: dict) -> str:
    recording_id = input_data["recording_id"]
    from app.services.db_service import get_db
    from app.database import get_db as _get_db
    with _get_db() as db:
        row = db.execute("SELECT * FROM recordings WHERE id = ?", (recording_id,)).fetchone()
    if not row:
        return json.dumps({"error": "Recording not found"})

    if row["transcript_text"]:
        return json.dumps({"transcript": row["transcript_text"], "status": "already_done"})

    transcript = transcribe_file(row["file_path"])
    db_service.update_recording(recording_id, transcript)
    return json.dumps({"transcript": transcript, "status": "done"})


def _handle_extract_corrections(input_data: dict) -> str:
    saved = []
    source = input_data.get("source", "manual")
    for corr in input_data["corrections"]:
        result = db_service.save_correction(
            lesson_id=input_data["lesson_id"],
            original=corr["original"],
            corrected=corr["corrected"],
            explanation=corr.get("explanation"),
            error_type=corr.get("error_type"),
            source=source,
        )
        saved.append(result)
    # 교정 저장 완료 → 프로필 자동 갱신 (백그라운드, latency 없음)
    trigger_profile_update()
    return json.dumps({"count": len(saved), "corrections": [{"id": s["id"], "original": s["original"], "corrected": s["corrected"]} for s in saved]}, ensure_ascii=False)


def _handle_generate_drill(input_data: dict) -> str:
    saved = []
    for drill in input_data["drills"]:
        result = db_service.save_drill(
            lesson_id=input_data["lesson_id"],
            correction_id=drill.get("correction_id"),
            drill_type=drill["drill_type"],
            question=drill["question"],
            correct_answer=drill.get("correct_answer"),
        )
        saved.append(result)
    return json.dumps({"count": len(saved), "drills": [{"id": s["id"], "question": s["question"]} for s in saved]}, ensure_ascii=False)


def _handle_evaluate_drill_answer(input_data: dict) -> str:
    from app.database import get_db as _get_db
    with _get_db() as db:
        db.execute(
            "UPDATE drill_sessions SET user_answer = ?, is_completed = ?, feedback = ? WHERE id = ?",
            (input_data["user_answer"], int(input_data["is_correct"]), input_data["feedback"], input_data["drill_id"]),
        )
    return json.dumps({
        "drill_id": input_data["drill_id"],
        "is_correct": input_data["is_correct"],
        "feedback": input_data["feedback"],
    }, ensure_ascii=False)


def _handle_generate_quiz(input_data: dict) -> str:
    saved = []
    for quiz in input_data["quizzes"]:
        result = db_service.save_quiz(
            lesson_id=input_data["lesson_id"],
            question=quiz["question"],
            answer=quiz["answer"],
            quiz_type=quiz.get("quiz_type", "fill_blank"),
        )
        saved.append(result)
    return json.dumps({"count": len(saved), "quizzes": [{"id": s["id"], "question": s["question"]} for s in saved]}, ensure_ascii=False)


def _handle_analyze_error_patterns(input_data: dict) -> str:
    stats = db_service.get_error_stats()
    patterns = db_service.get_error_patterns()
    return json.dumps({
        "analysis_type": input_data["analysis_type"],
        "stats": stats,
        "patterns": patterns,
    }, ensure_ascii=False)


def _handle_save_learner_profile(input_data: dict) -> str:
    result = db_service.save_learner_profile(input_data)
    return json.dumps({"saved": True, "id": result["id"], "summary": result["summary"]}, ensure_ascii=False)


def _handle_get_recurring_errors(input_data: dict) -> str:
    errors = db_service.get_recurring_errors(
        error_type=input_data.get("error_type"),
        limit=input_data.get("limit", 5),
    )
    return json.dumps({"count": len(errors), "errors": errors}, ensure_ascii=False)


def _handle_get_related_expressions(input_data: dict) -> str:
    exprs = db_service.get_related_expressions(
        topic=input_data["topic"],
        limit=input_data.get("limit", 8),
    )
    return json.dumps({"count": len(exprs), "expressions": exprs}, ensure_ascii=False)


def _handle_get_unmastered_vocab(input_data: dict) -> str:
    vocab = db_service.get_unmastered_vocab(limit=input_data.get("limit", 10))
    return json.dumps({"count": len(vocab), "vocab": vocab}, ensure_ascii=False)


def _handle_get_recent_diary(input_data: dict) -> str:
    entries = db_service.get_recent_diary(
        days=input_data.get("days", 7),
        limit=input_data.get("limit", 5),
    )
    return json.dumps({"count": len(entries), "entries": entries}, ensure_ascii=False)


TOOL_HANDLERS = {
    "generate_smalltalk_scenario": _handle_generate_smalltalk_scenario,
    "polish_english": _handle_polish_english,
    "analyze_script": _handle_analyze_script,
    "explain_expression": _handle_explain_expression,
    "transcribe_audio": _handle_transcribe_audio,
    "extract_corrections": _handle_extract_corrections,
    "generate_drill": _handle_generate_drill,
    "evaluate_drill_answer": _handle_evaluate_drill_answer,
    "generate_quiz": _handle_generate_quiz,
    "analyze_error_patterns": _handle_analyze_error_patterns,
    "save_learner_profile": _handle_save_learner_profile,
    "get_recurring_errors": _handle_get_recurring_errors,
    "get_related_expressions": _handle_get_related_expressions,
    "get_unmastered_vocab": _handle_get_unmastered_vocab,
    "get_recent_diary": _handle_get_recent_diary,
}


def execute_tool(tool_name: str, tool_input: dict) -> str:
    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        return json.dumps({"error": f"Unknown tool: {tool_name}"})
    return handler(tool_input)
