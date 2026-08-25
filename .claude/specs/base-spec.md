# Phone English Learning Agent v2 — Product Spec

## 개요

전화영어 수업의 학습 효과를 극대화하기 위한 AI 에이전트.
수업 전 30분(스몰톡 준비 + 토픽 예습 + 프리토킹)과 수업 후 30분(피드백 분석 + 오류 교정 + 드릴 연습 + 자유 작문)을 체계적으로 코칭한다.

- **사용 환경**: 로컬 Mac (Apple Silicon)
- **수업 일정**: 주로 월/수/금이나 유동적. 요청 시 당일 수업 가정

---

## 학습 흐름

```
[수업 전 30분]          [수업 20분]          [수업 후 30분]
┌─────────────┐      ┌──────────┐      ┌──────────────┐
│ 1. 일상 이야기│      │          │      │ 1. 녹음/피드백  │
│   (10분)     │      │  전화영어  │      │    입력 (5분)  │
│ 2. 기사 분석  │  →   │  수업     │  →   │ 2. 분석 결과   │
│   (10분)     │      │  진행     │      │    확인 (5분)  │
│ 3. 프리토킹   │      │          │      │ 3. 드릴 연습   │
│   (10분)     │      │          │      │    (10분)     │
└─────────────┘      └──────────┘      │ 4. 자유 작문   │
                                       │    (10분)     │
                                       └──────────────┘
```

---

## 핵심 기능

### 수업 전 준비 (3단계 플로우)

#### Step 1: 일상 이야기
- 요일 기반 컨텍스트 (월 → "주말 있었던 일", 수 → "어제 있었던 일")
- 텍스트/음성으로 일상 이야기 입력
- Agent가 영어로 다듬고 강사 역할로 후속 질문
- 도구: `generate_smalltalk_scenario`, `polish_english`

#### Step 2: 기사 분석
- 토픽/기사/토론 질문 입력 및 저장
- Agent가 핵심 표현 추출 + 어휘 설명
- PREP 패턴 답변 구조 코칭
- 도구: `analyze_script`, `explain_expression`

#### Step 3: 프리토킹
- Step 2의 토론 질문 기반 자유 대화
- Agent가 강사 역할로 질문 → 교정 → 후속 질문
- 도구: `explain_expression` (필요 시)

### 수업 후 복습 (4단계 플로우)

#### Step 1: 입력
- 녹음 파일 업로드 → mlx-whisper 전사 (타임스탬프 포함)
- 강사 피드백 텍스트 붙여넣기 또는 스크린샷 업로드 (Claude Vision)
- 화자 구분 (Teacher/Student) 후 Student 발화만 교정

#### Step 2: 분석 결과
- 오류 유형별 분포 (tense/preposition/article/word_order/word_choice/pronunciation/grammar)
- 교정 목록 (원문 → 교정문 + 설명)
- 마크다운 리포트 생성 및 다운로드

#### Step 3: 드릴 연습
- 오류 기반 문장 구조 드릴 (빈칸 채우기, 문장 변환, 오류 찾기, 자유 작문)
- 체크박스로 완료 추적

#### Step 4: 자유 작문
- 배운 표현 활용 자유 작문 연습
- Agent가 교정 + 개선 피드백

### 학습 기록
- 오류 유형별 빈도 차트 (BarChart)
- 시간별 오류 추이 그래프 (LineChart)
- AI 텍스트 리포트 (주간/월간)
- 수업 이력 + 표현 사전

---

## 에이전트 도구

| 도구 | 설명 | 모드 |
|------|------|------|
| `generate_smalltalk_scenario` | 요일 기반 스몰톡 시나리오 생성 | prep |
| `polish_english` | 한국어/거친 영어 → 자연스러운 영어 | prep |
| `analyze_script` | 기사에서 핵심 표현 추출 | prep |
| `explain_expression` | 표현 상세 설명 (의미, 예문, 발음) | prep |
| `transcribe_audio` | 녹음 파일 Whisper 전사 | review |
| `extract_corrections` | 오류 추출 및 교정 (유형 분류) | review |
| `generate_drill` | 오류 기반 드릴 생성 | review |
| `evaluate_drill_answer` | 드릴 답변 평가 | review |
| `generate_quiz` | 복습 퀴즈 생성 | review |
| `analyze_error_patterns` | 누적 오류 패턴 분석 | analytics |

---

## 데이터 모델

9개 테이블: `lessons`, `smalltalk_scenarios`, `expressions`, `recordings`, `corrections`, `drill_sessions`, `error_patterns`, `quizzes`, `daily_stories`

핵심 관계:
- `corrections.error_type` → `error_patterns.pattern_type` (자동 upsert)
- `drill_sessions.correction_id` → `corrections.id`
- 모든 테이블 `lesson_id` → `lessons.id` (CASCADE DELETE)

---

## 인증

멀티 프로바이더 지원:
- **Anthropic Direct**: `ANTHROPIC_API_KEY`
- **AWS Bedrock**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (또는 기본 자격증명 체인)

설정 UI에서 라디오 버튼으로 프로바이더 선택, .env 파일에 저장.
