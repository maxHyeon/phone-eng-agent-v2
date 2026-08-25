# Feature Spec: 지난 수업 복습 (Previous Lesson Review)

## 1. 목적

수업 전 준비 단계에서 **지난 수업의 핵심 학습 내용을 복습**하여 장기 기억 전환을 돕는다.
에빙하우스 망각 곡선에 따르면 24시간 내 복습이 기억 유지에 결정적이므로, 다음 수업 준비 시작 전에 지난 수업 내용을 빠르게 리마인드한다.

## 2. 사용자 시나리오

1. 사용자가 수업 전 준비(Prep) 탭에 진입
2. **"0. 지난 수업 복습"** 탭이 가장 먼저 보임 (기존 1~3 탭 앞에 추가)
3. 지난 수업(가장 최근 `completed` 상태 수업)의 데이터를 자동 로드
4. 세 가지 섹션으로 구성:
   - **A. 다듬어진 표현**: 일상 이야기에서 만든 영어 표현
   - **B. 핵심 표현**: 수업에서 배운 주요 표현/어휘
   - **C. 오류 교정**: 수업 후 복습에서 발견된 오류와 교정 내용
5. 각 섹션을 읽고, 선택적으로 AI와 대화하며 복습 (퀴즈, 예문 생성 등)
6. 복습 완료 후 "1. 일상 이야기" 탭으로 이동하여 오늘 수업 준비 시작

## 3. 데이터 소스

### A. 다듬어진 표현 (Polished Expressions)

| 소스 테이블 | 필드 | 설명 |
|------------|------|------|
| `daily_stories` | `korean_input` → 내 입력, `english_output` → AI 교정 | 사용자 입력과 AI가 다듬어준 결과 |
| `smalltalk_scenarios` | `user_input_kr` → 내 입력, `english_output` → AI 교정, `key_expressions` | 스몰톡 시나리오의 입력/교정 쌍 + 핵심 표현 |

> **참고**: 사용자 입력이 항상 한국어라는 보장이 없음. 영어로 입력 후 AI가 더 자연스러운 표현으로 교정해주는 케이스도 있으므로, UI에서 "한국어/영어"가 아닌 **"내 입력 / AI 교정"**으로 레이블링한다.

### B. 핵심 표현 (Key Expressions)

| 소스 테이블 | 필드 | 설명 |
|------------|------|------|
| `expressions` | `expression`, `meaning`, `example`, `source` | 기사/대화에서 추출된 표현 |

### C. 오류 교정 (Error Corrections)

| 소스 테이블 | 필드 | 설명 |
|------------|------|------|
| `corrections` | `original`, `corrected`, `explanation`, `error_type` | 발견된 오류와 교정 |
| `drill_sessions` | `drill_type`, `question`, `correct_answer`, `user_answer`, `is_completed` | 드릴 결과 (틀린 것 위주) |

## 4. UI 설계

### 4.1 탭 구조 변경

**기존**: `1. 일상 이야기` | `2. 기사 분석` | `3. 프리토킹`

**변경**: `0. 지난 수업 복습` | `1. 일상 이야기` | `2. 기사 분석` | `3. 프리토킹`

- 지난 수업이 없는 경우(첫 수업): 탭 비활성화 + "아직 복습할 수업이 없습니다" 메시지
- 지난 수업이 `completed` 상태가 아닌 경우: 가장 최근 `completed` 수업을 탐색

### 4.2 복습 탭 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  0. 지난 수업 복습                        [2026-05-09 금]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ A. 다듬어진 표현 ─────────────────────────────────┐ │
│  │ ✏️ 내 입력: 주말에 친구랑 카페에서 공부했어요       │ │
│  │ ✨ AI 교정: I studied at a café with my friend     │ │
│  │            over the weekend.                       │ │
│  │                                                    │ │
│  │ 핵심 표현: over the weekend, study at a café       │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ B. 핵심 표현 ────────────────────────────────────┐  │
│  │ • get the ball rolling — 일을 시작하다            │  │
│  │   예: Let's get the ball rolling on this project. │  │
│  │ • bring ~ to the table — ~을 제공하다             │  │
│  │   예: What do you bring to the table?             │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ C. 오류 교정 ────────────────────────────────────┐  │
│  │ [TENSE] I go to the gym yesterday.                │  │
│  │      → I went to the gym yesterday.               │  │
│  │   💡 과거 시제: 어제 일은 과거형으로               │  │
│  │                                                    │  │
│  │ [ARTICLE] I bought computer last week.            │  │
│  │        → I bought a computer last week.           │  │
│  │   💡 셀 수 있는 명사 앞에는 관사 필요              │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─ 복습 채팅 ───────────────────────────────────────┐  │
│  │ [AI] 지난 수업 내용을 복습해볼까요? 위 표현 중    │  │
│  │      하나를 사용해서 문장을 만들어 보세요!         │  │
│  │                                                    │  │
│  │ [입력창]                              [전송] [중지]│  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│                          [복습 완료 → 다음 단계로 →]    │
└─────────────────────────────────────────────────────────┘
```

### 4.3 복습 채팅 인터랙션

복습 탭 하단에 채팅 패널을 배치하여 AI와 상호작용 복습 가능:

- **퀴즈 모드**: AI가 지난 수업 표현/오류를 기반으로 퀴즈 출제
  - 빈칸 채우기: "I ___ to the gym yesterday." (went)
  - 한→영 번역: "주말에 친구랑 카페에서 공부했어요" → ?
  - 오류 찾기: "I go to the gym yesterday." 에서 틀린 부분은?
- **자유 연습**: 사용자가 지난 표현을 사용해 새 문장을 작성하면 AI가 피드백
- **설명 요청**: 특정 표현이나 오류에 대해 추가 설명 요청 가능

## 5. API 설계

### 5.1 새 엔드포인트

```
GET /api/lessons/{lesson_id}/review-summary
```

**Response:**
```json
{
  "lesson": {
    "id": 5,
    "date": "2026-05-09",
    "day_of_week": "friday",
    "topic": "Remote Work Trends"
  },
  "polished_expressions": [
    {
      "user_input": "주말에 친구랑 카페에서 공부했어요",
      "ai_output": "I studied at a café with my friend over the weekend.",
      "key_expressions": ["over the weekend", "study at a café"]
    }
  ],
  "key_expressions": [
    {
      "expression": "get the ball rolling",
      "meaning": "일을 시작하다",
      "example": "Let's get the ball rolling on this project.",
      "source": "script"
    }
  ],
  "corrections": [
    {
      "original": "I go to the gym yesterday.",
      "corrected": "I went to the gym yesterday.",
      "explanation": "과거 시제: 어제 일은 과거형으로 표현",
      "error_type": "tense"
    }
  ],
  "failed_drills": [
    {
      "drill_type": "fill_blank",
      "question": "I ___ to the gym yesterday.",
      "correct_answer": "went",
      "user_answer": "go"
    }
  ]
}
```

### 5.2 지난 수업 조회 로직

```
GET /api/lessons/previous?current_lesson_id={id}
```

- `current_lesson_id`를 기준으로 해당 수업 이전에 `status='completed'`인 가장 최근 수업을 반환
- 없으면 404

### 5.3 기존 엔드포인트 활용

| 용도 | 엔드포인트 |
|------|-----------|
| 지난 수업 표현 | `GET /api/lessons/{id}/corrections` |
| 지난 수업 드릴 | `GET /api/lessons/{id}/drills` |
| 표현 목록 | `GET /api/expressions?lesson_id={id}` |

## 6. 에이전트 도구 매핑

### 6.1 새 모드 추가

기존 prep 모드에 서브모드 추가: `prep:review_previous`

### 6.2 시스템 프롬프트 컨텍스트

```
당신은 전화영어 수업 전 복습 코치입니다.
학생이 지난 수업에서 배운 내용을 효과적으로 복습할 수 있도록 도와주세요.

[지난 수업 데이터]
- 날짜: {previous_lesson.date}
- 주제: {previous_lesson.topic}
- 다듬어진 표현: {polished_expressions}
- 핵심 표현: {key_expressions}  
- 오류 교정: {corrections}

복습 방법:
1. 지난 수업 핵심 내용을 간단히 요약
2. 표현을 활용한 퀴즈 출제 (빈칸, 번역, 오류 찾기)
3. 사용자의 답변에 피드백 제공
4. 틀린 문제는 반복 출제
```

### 6.3 새 에이전트 도구

| 도구명 | 설명 | 매개변수 |
|--------|------|----------|
| `generate_review_quiz` | 지난 수업 데이터 기반 퀴즈 생성 | `lesson_id`, `quiz_type` (fill_blank/translation/find_error), `source_type` (expression/correction) |
| `evaluate_review_answer` | 복습 퀴즈 답변 평가 | `quiz_id`, `user_answer` |

- 기존 `quizzes` 테이블 재활용 (quiz_type 확장)
- 복습 퀴즈 결과도 `quizzes` 테이블에 저장하여 학습 이력 추적

## 7. 데이터 모델 변경

### 7.1 기존 테이블 변경 없음

모든 데이터는 기존 테이블에서 조회 가능. 새 테이블 불필요.

### 7.2 quizzes 테이블 quiz_type 확장

기존: `fill_blank`, `usage`, `translation`

추가: `review_fill_blank`, `review_translation`, `review_find_error`

`review_` 접두사로 복습 퀴즈를 구분하여 분석 시 활용.

### 7.3 lessons 테이블에 review_completed 필드 추가 (선택사항)

```sql
ALTER TABLE lessons ADD COLUMN prev_review_done INTEGER DEFAULT 0;
```

- 오늘 수업 시작 전 복습 완료 여부 추적
- Analytics에서 "복습 수행률" 지표로 활용 가능

## 8. 프론트엔드 컴포넌트 구조

```
frontend/src/components/prep/
├── PrepPanel.tsx              # 탭 추가: 0번 탭
├── PreviousReviewPanel.tsx    # 새 컴포넌트 (복습 탭 메인)
├── ReviewSummaryCard.tsx      # 섹션 A/B/C 카드 렌더링
├── ReviewChatPanel.tsx        # 복습 채팅 (기존 ChatPanel 재사용 가능)
├── DailyStoryInput.tsx        # 기존 유지
├── TopicInput.tsx             # 기존 유지
└── ChatPanel.tsx              # 기존 유지
```

### 8.1 PreviousReviewPanel.tsx

- Props: `lessonId` (오늘 수업 ID)
- Mount 시 `GET /api/lessons/previous?current_lesson_id={lessonId}` 호출
- 지난 수업 ID 획득 후 `GET /api/lessons/{id}/review-summary` 호출
- 데이터 로드 완료 시 세 섹션 렌더링
- 하단 채팅 패널: `useChat` 훅 활용, mode=`prep`, 서브모드 구분은 초기 메시지로

### 8.2 ReviewSummaryCard.tsx

- Props: `type` ('polished' | 'expression' | 'correction'), `data`
- 타입별 렌더링 분기:
  - polished: 내 입력 → AI 교정 표시 + 핵심 표현 태그
  - expression: 표현 + 의미 + 예문
  - correction: error_type 배지 + original(취소선) → corrected + 설명

## 9. 엣지 케이스

| 상황 | 처리 |
|------|------|
| 첫 수업 (이전 수업 없음) | 탭 비활성 + 안내 메시지 |
| 이전 수업이 review 없이 완료됨 | corrections/drills 비어있음 → 해당 섹션 "데이터 없음" 표시, 나머지 섹션만 노출 |
| 이전 수업의 일상 이야기를 건너뛴 경우 | daily_stories 비어있음 → A 섹션 숨김 |
| 모든 섹션이 비어있는 경우 | "지난 수업의 복습 데이터가 없습니다. 다음 단계로 넘어가세요." + 자동 다음 탭 이동 제안 |
| 여러 날 연속 수업이 있는 경우 | 가장 최근 completed 수업 1개만 표시 (드롭다운으로 이전 수업 선택 가능 — v2 고려) |

## 10. 성공 지표

- 복습 탭 진입률: 수업 준비 시작 시 복습 탭 클릭 비율
- 복습 퀴즈 정답률: 시간 경과에 따른 정답률 추이
- 동일 오류 재발률: 복습 후 동일 error_type 발생 감소 여부

## 11. 구현 우선순위

### Phase 1 (MVP)
- [ ] `GET /api/lessons/previous` 엔드포인트
- [ ] `GET /api/lessons/{id}/review-summary` 엔드포인트
- [ ] `PreviousReviewPanel` 컴포넌트 (데이터 표시만)
- [ ] PrepPanel 탭 구조 변경 (0번 탭 추가)

### Phase 2 (Interactive)
- [ ] 복습 채팅 + 에이전트 프롬프트 (`prep:review_previous` 컨텍스트)
- [ ] `generate_review_quiz` / `evaluate_review_answer` 도구
- [ ] 퀴즈 결과 저장 (`quizzes` 테이블)

### Phase 3 (Analytics)
- [ ] `prev_review_done` 필드 + 복습 완료 추적
- [ ] Analytics 대시보드에 복습 수행률/정답률 차트 추가
- [ ] 이전 수업 선택 드롭다운 (최근 N개)

## 12. 의존성

- 기존 `corrections`, `expressions`, `daily_stories`, `smalltalk_scenarios` 테이블에 데이터가 있어야 함
- 수업이 `completed` 상태로 전환되어야 복습 대상이 됨
- 기존 `useChat` 훅 및 SSE 스트리밍 인프라 재사용
