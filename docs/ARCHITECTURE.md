# Phone English Agent v2 — Technical Architecture

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Python + FastAPI + Anthropic SDK |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| AI | Claude API (대화, 분석, 도구 호출) |
| 음성 전사 | mlx-whisper `small` 모델 (Apple Silicon 네이티브) |
| 이미지 텍스트 추출 | Claude Vision API |
| 차트 | Recharts |
| DB | SQLite |

---

## AI Agent 아키텍처

### Agentic Loop (Tool Use 패턴)

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Loop (SSE Stream)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  User Message    │
                    └──────────────────┘
                              │
                              ▼
          ┌───────────────────────────────────────┐
          │ Claude API (messages.stream)          │
          │ - System Prompt (mode별 역할 지시)    │
          │ - Tools (mode별 가용 도구)             │
          │ - Conversation History                │
          └───────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
        ┌──────────────┐          ┌──────────────┐
        │  end_turn    │          │  tool_use    │
        │  (완료)       │          │  (도구 호출)  │
        └──────────────┘          └──────────────┘
                │                           │
                │                           ▼
                │                ┌──────────────────────┐
                │                │ Execute Tool         │
                │                │ - DB 저장            │
                │                │ - Whisper 전사       │
                │                │ - 데이터 조회         │
                │                └──────────────────────┘
                │                           │
                │                           ▼
                │                ┌──────────────────────┐
                │                │ tool_result 전달     │
                │                │ (user message)       │
                │                └──────────────────────┘
                │                           │
                │                           ▼
                │                   (다시 Claude 호출)
                │                           │
                └───────────────┬───────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │ SSE Events   │
                        │ - text_delta │
                        │ - tool_start │
                        │ - tool_result│
                        │ - done       │
                        └──────────────┘
                                │
                                ▼
                          Frontend UI
```

### 모드별 Agent 역할

#### 1. **Prep Mode** — 수업 전 준비 코치

**역할**: 전화영어 강사 + 학습 코치

**워크플로우**:
1. **스몰톡 연습** — 한국어 입력 → 자연스러운 영어 변환 + 후속 질문
2. **토픽 분석** — 기사/스크립트 → 핵심 표현 추출 + PREP 패턴 코칭
3. **프리토킹** — 토론 질문 기반 자유 대화 + 실시간 교정

**사용 도구** (4개):
- `generate_smalltalk_scenario` — 스몰톡 시나리오 저장
- `polish_english` — 한국어→영어 변환 및 다듬기
- `analyze_script` — 기사에서 핵심 표현 추출
- `explain_expression` — 표현 상세 설명 (예문/발음)

#### 2. **Review Mode** — 수업 후 복습 분석가

**역할**: 오류 분석 + 드릴 생성

**워크플로우**:
1. 녹음 전사 또는 피드백 입력 받기
2. 오류 추출 및 유형 분류 (tense/preposition/article 등)
3. 각 오류당 드릴 문제 자동 생성
4. UI 패널에 결과 표시 (텍스트 응답 최소화)

**사용 도구** (5개):
- `transcribe_audio` — 녹음 파일 → 텍스트 (mlx-whisper)
- `extract_corrections` — 오류 추출 + 교정 + 유형 분류
- `generate_drill` — 오류 기반 드릴 생성 (fill_blank/transform/find_error/free_write)
- `evaluate_drill_answer` — 학습자 답변 평가 + 피드백
- `generate_quiz` — 복습 퀴즈 생성

#### 3. **Analytics Mode** — 학습 기록 분석가

**역할**: 데이터 분석 + 리포트 생성

**워크플로우**:
1. 누적 오류 패턴 분석 (주간/월간)
2. 반복 실수 식별
3. 맞춤 학습 추천

**사용 도구** (1개):
- `analyze_error_patterns` — 오류 통계 + 트렌드 분석

### 10개 AI 도구 (Tools)

| # | 도구 이름 | 역할 | 입력 | 출력 | 모드 |
|---|----------|------|------|------|------|
| 1 | `generate_smalltalk_scenario` | 스몰톡 시나리오 저장 | 요일 컨텍스트, 한국어 입력, 영어 출력, 핵심 표현 | DB 저장 완료 | prep |
| 2 | `polish_english` | 한국어/거친 영어 → 자연스러운 영어 | 원본, 다듬어진 영어, 핵심 표현, 대안 표현 | 다듬어진 결과 + DB 저장 | prep |
| 3 | `analyze_script` | 기사/스크립트에서 핵심 표현 추출 | 표현 목록 (expression, meaning, example) | 추출 개수 + DB 저장 | prep |
| 4 | `explain_expression` | 표현 상세 설명 | 표현, 의미, 영어 정의, 예문, 발음 팁 | 설명 + DB 저장 | prep |
| 5 | `transcribe_audio` | 녹음 → 텍스트 전사 | recording_id | 전사 텍스트 + DB 업데이트 | review |
| 6 | `extract_corrections` | 오류 추출 및 교정 | 교정 목록 (original, corrected, explanation, error_type) | 저장된 교정 ID 목록 | review |
| 7 | `generate_drill` | 오류 기반 드릴 생성 | 드릴 목록 (drill_type, question, correct_answer) | 저장된 드릴 ID 목록 | review |
| 8 | `evaluate_drill_answer` | 드릴 답변 평가 | drill_id, user_answer, is_correct, feedback | 평가 결과 + DB 업데이트 | review |
| 9 | `generate_quiz` | 복습 퀴즈 생성 | 퀴즈 목록 (question, answer, quiz_type) | 저장된 퀴즈 ID 목록 | review |
| 10 | `analyze_error_patterns` | 누적 오류 패턴 분석 | analysis_type (weekly/monthly/all) | 통계 + 패턴 데이터 | analytics |

### SSE (Server-Sent Events) 스트리밍

Agent 응답은 실시간으로 스트리밍됩니다:

```typescript
// Event Types
event: text_delta      // Claude 응답 텍스트 (한 글자씩)
data: "안녕하세요"

event: tool_start      // 도구 호출 시작
data: {"name": "extract_corrections"}

event: tool_result     // 도구 실행 결과
data: {"name": "extract_corrections", "result": {...}}

event: done            // 대화 완료
data: {"status": "complete"}
```

**장점**:
- ✅ 실시간 타이핑 효과 (자연스러운 대화)
- ✅ 도구 실행 상태 표시 (투명성)
- ✅ 긴 응답도 즉시 시작 (UX 개선)

### Conversation History 관리

- **Persistent**: 수업별 대화 히스토리 SQLite 저장
- **Validation**: tool_use/tool_result 페어링 검증 (API 에러 방지)
- **Context**: 각 모드마다 독립적인 대화 컨텍스트 유지

---

## 프로젝트 구조

```
phone-eng-agent-v2/
├── .claude/                # 스티어링, 스펙, 구현 계획 (SSOT)
│   ├── CLAUDE.md           # 스티어링 문서
│   ├── specs/              # 기능 스펙
│   └── plans/              # 구현 계획
├── docs/
│   ├── ARCHITECTURE.md     # 기술 아키텍처 (이 문서)
│   └── screenshots/        # README용 스크린샷
├── backend/
│   ├── app/
│   │   ├── agent/          # AI 에이전트 (루프, 프롬프트, 도구 10개)
│   │   ├── routes/         # API 엔드포인트 11개
│   │   ├── services/       # DB, Whisper, 이미지 파서
│   │   ├── config.py       # 환경변수 + 멀티 프로바이더
│   │   ├── ai_client.py    # Anthropic/Bedrock 클라이언트 팩토리
│   │   ├── database.py     # SQLite 스키마 (9개 테이블)
│   │   ├── models.py       # Pydantic 모델
│   │   └── main.py         # FastAPI 앱
│   ├── data/               # SQLite DB
│   ├── uploads/            # 녹음 파일
│   ├── reports/            # 리뷰 리포트 (md)
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── api/            # REST + SSE 클라이언트
│   │   ├── hooks/          # useChat, useLesson, useVoiceInput
│   │   ├── components/
│   │   │   ├── chat/       # 채팅 패널 (마크다운 렌더링)
│   │   │   ├── prep/       # 수업 전 준비 (3단계)
│   │   │   ├── review/     # 수업 후 복습 (4단계)
│   │   │   ├── analytics/  # 학습 기록
│   │   │   └── settings/   # 프로바이더 설정
│   │   └── types/
│   └── package.json
└── README.md
```
