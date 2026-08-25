# Feature Spec: 표현 노트 (Vocabulary Book)

## 1. 목적

전화영어의 모든 과정(수업 준비, 수업 중, 수업 후 복습)에서 마주친 표현/단어/숙어를 **수동으로 저장**하고, 저장된 표현들을 **리스트 열람 + 플래시카드**로 복습하는 기능.

## 2. 핵심 요구사항

| 항목 | 결정 |
|------|------|
| 저장 방식 | 사용자 수동 저장 |
| 분류 체계 | 카테고리: word / idiom / pattern |
| 필수 입력 | 표현(expression) + 뜻(meaning) |
| 선택 입력 | 예문(example), 메모(note) |
| 저장 UI | 글로벌 플로팅 버튼 + 모달 + 키보드 단축키(Cmd+Shift+S) |
| 복습 위치 | 학습기록(Analytics) 탭 내 서브탭 |
| 복습 형태 | 리스트 열람 + 플래시카드 (양방향: 영→한, 한→영 선택) |

## 3. 데이터 모델

### 3.1 새 테이블: `vocab_entries`

```sql
CREATE TABLE IF NOT EXISTS vocab_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expression TEXT NOT NULL,
    meaning TEXT NOT NULL,
    example TEXT,
    note TEXT,
    category TEXT NOT NULL DEFAULT 'word',  -- word / idiom / pattern
    source_lesson_id INTEGER,               -- 어떤 수업에서 저장했는지 (nullable)
    source_context TEXT,                     -- 저장 시점의 모드 (prep/review/analytics)
    mastery INTEGER NOT NULL DEFAULT 0,     -- 0: 새로움, 1: 학습중, 2: 숙달
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (source_lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
);
```

**기존 `expressions` 테이블과의 관계:**
- `expressions`는 AI 에이전트가 도구로 저장하는 수업별 자동 추출 표현
- `vocab_entries`는 사용자가 직접 선별하여 저장하는 개인 단어장
- 별도 테이블로 분리하여 각 역할을 명확히 구분

### 3.2 필드 상세

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| expression | TEXT | O | 영어 표현 (예: "get the ball rolling") |
| meaning | TEXT | O | 한국어 뜻 (예: "일을 시작하다") |
| example | TEXT | X | 예문 (예: "Let's get the ball rolling.") |
| note | TEXT | X | 개인 메모 (예: "회의에서 자주 쓰임") |
| category | TEXT | O | word / idiom / pattern |
| source_lesson_id | INT | X | 저장 시 현재 수업 ID (자동 기록) |
| source_context | TEXT | X | prep / review / analytics (자동 기록) |
| mastery | INT | O | 0: 새로움, 1: 학습중, 2: 숙달 (플래시카드에서 변경) |

## 4. UI 설계

### 4.1 글로벌 저장 UI (플로팅 버튼 + 모달)

**플로팅 버튼:**
- 위치: 화면 우하단 고정
- 디자인: 원형, `+` 아이콘, blue-600 색상
- 클릭 또는 `Cmd+Shift+S` 단축키로 모달 열기
- 모든 모드(prep/review/analytics)에서 항상 노출

**저장 모달:**
```
┌─────────────────────────────────────────────┐
│  표현 저장                              [X] │
├─────────────────────────────────────────────┤
│                                             │
│  카테고리:  [단어] [숙어] [문장패턴]        │
│                                             │
│  표현 *                                     │
│  ┌─────────────────────────────────────┐    │
│  │ get the ball rolling               │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  뜻 *                                       │
│  ┌─────────────────────────────────────┐    │
│  │ 일을 시작하다                       │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  예문 (선택)                                │
│  ┌─────────────────────────────────────┐    │
│  │ Let's get the ball rolling on this │    │
│  │ project.                           │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  메모 (선택)                                │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│                              [취소] [저장]  │
└─────────────────────────────────────────────┘
```

- 카테고리: 3개 버튼 토글 (기본값: word)
- 표현/뜻: 필수 입력 (비어있으면 저장 버튼 비활성)
- 저장 성공 시 토스트 메시지 + 모달 닫기
- `source_lesson_id`와 `source_context`는 현재 수업/모드에서 자동 기록

### 4.2 복습 UI (학습기록 탭 내 서브탭)

**위치:** 기존 Analytics 탭의 사이드바에 새로운 섹션 "표현 노트" 추가

```
Analytics 사이드바:
┌────────────────────────┐
│ [오류 유형 분포 차트]   │
│ [오류 추이 차트]        │
│ [수업 이력]            │
│ [표현 목록]            │  ← 기존 (AI 추출 표현)
│ ─────────────────────  │
│ [📒 표현 노트]         │  ← 신규 서브 섹션
│   [리스트] [플래시카드] │
└────────────────────────┘
```

**또는** 독립적인 서브탭으로:

```
학습기록 탭 상단:
[ 오류분석 | 표현노트 ]
```

→ **독립 서브탭**으로 구현. 학습기록 탭 상단에 `오류분석 / 표현노트` 서브 탭 네비게이션 추가.

### 4.3 표현 노트 - 리스트 뷰

```
┌─────────────────────────────────────────────────────┐
│  표현 노트                    [리스트] [플래시카드]  │
├─────────────────────────────────────────────────────┤
│  필터: [전체▾] [단어] [숙어] [문장패턴]            │
│  검색: [________________🔍]                         │
│                                                     │
│  ┌─ get the ball rolling ──────────── [idiom] ──┐  │
│  │  일을 시작하다                                │  │
│  │  예: Let's get the ball rolling on this...    │  │
│  │  📅 2026-05-14                    [✏️] [🗑️]  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ elaborate ─────────────────────── [word] ───┐  │
│  │  정교하게 설명하다                            │  │
│  │  예: Could you elaborate on that point?       │  │
│  │  📅 2026-05-15                    [✏️] [🗑️]  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ The more ~, the more ~ ─────── [pattern] ──┐  │
│  │  ~할수록 더 ~하다                             │  │
│  │  예: The more you practice, the more...       │  │
│  │  📅 2026-05-16                    [✏️] [🗑️]  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  총 24개 표현 저장됨                                 │
└─────────────────────────────────────────────────────┘
```

- 카테고리 필터 (전체/word/idiom/pattern)
- 키워드 검색 (표현 + 뜻 대상)
- 카드별 편집/삭제 버튼
- 날짜순 정렬 (최신순)

### 4.4 표현 노트 - 플래시카드 뷰

```
┌─────────────────────────────────────────────────────┐
│  플래시카드 복습                 [리스트] [플래시카드]│
├─────────────────────────────────────────────────────┤
│                                                     │
│  방향: [영→한] [한→영]       필터: [전체▾]         │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │                                               │  │
│  │              get the ball rolling             │  │
│  │                   [idiom]                     │  │
│  │                                               │  │
│  │                                               │  │
│  │              (클릭하여 뒤집기)                 │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│          [모르겠어요]  [애매해요]  [알아요!]         │
│                                                     │
│  진행: 3 / 24                                       │
└─────────────────────────────────────────────────────┘
```

**카드 앞면 (영→한 모드):** 영어 표현 + 카테고리 배지
**카드 뒷면 (영→한 모드):** 뜻 + 예문 + 메모

**카드 앞면 (한→영 모드):** 한국어 뜻
**카드 뒷면 (한→영 모드):** 영어 표현 + 예문 + 메모

> **참고**: 양방향 모두 뒷면에 예문과 메모를 항상 표시한다. 학습 시 추가 컨텍스트가 기억 정착에 도움이 되기 때문.

**자기평가 버튼:**
- 모르겠어요 → mastery 유지/감소
- 애매해요 → mastery 유지
- 알아요! → mastery 증가

**mastery 레벨:**
- 0 (새로움): 빨간 점 표시
- 1 (학습중): 노란 점 표시
- 2 (숙달): 초록 점 표시
- 3 (외움): 플래시카드에서 제외

**"외웠어요!" 기능:**
- 카드 뒤집은 상태에서 "외웠어요!" 버튼 표시 (기존 3개 평가 버튼 우측)
- 클릭 시 mastery = 3으로 설정, 해당 카드를 현재 세션에서 즉시 제거
- 플래시카드 조회 API에서 mastery >= 3인 항목은 제외
- 리스트뷰에서는 "외움" 배지와 함께 계속 표시
- 리스트뷰에서 "다시 학습" 버튼으로 mastery를 0으로 리셋 가능
- 모든 카드가 외움 상태면 "모든 표현을 외웠습니다!" + "리셋" 버튼 표시

**카드 순서:** mastery 낮은 것 우선, 같은 레벨 내에서는 랜덤 셔플

## 5. API 설계

### 5.1 새 엔드포인트

```
POST   /api/vocab                    — 표현 저장
GET    /api/vocab                    — 표현 목록 (필터/검색/정렬)
GET    /api/vocab/{id}               — 표현 상세
PUT    /api/vocab/{id}               — 표현 수정
DELETE /api/vocab/{id}               — 표현 삭제
PUT    /api/vocab/{id}/mastery       — mastery 업데이트
GET    /api/vocab/flashcard          — 플래시카드용 목록 (mastery 낮은 순 + 셔플)
```

### 5.2 요청/응답 상세

**POST /api/vocab**
```json
// Request
{
  "expression": "get the ball rolling",
  "meaning": "일을 시작하다",
  "example": "Let's get the ball rolling.",  // optional
  "note": "회의에서 자주 쓰임",               // optional
  "category": "idiom",
  "source_lesson_id": 24,                    // optional, auto from frontend
  "source_context": "prep"                   // optional, auto from frontend
}

// Response: 201
{
  "id": 1,
  "expression": "get the ball rolling",
  "meaning": "일을 시작하다",
  "example": "Let's get the ball rolling.",
  "note": "회의에서 자주 쓰임",
  "category": "idiom",
  "source_lesson_id": 24,
  "source_context": "prep",
  "mastery": 0,
  "created_at": "2026-05-18T10:30:00",
  "updated_at": "2026-05-18T10:30:00"
}
```

**GET /api/vocab?category=idiom&search=ball&sort=newest**
```json
// Response
[
  { "id": 1, "expression": "...", "meaning": "...", ... }
]
```

Query params:
- `category`: word / idiom / pattern (선택)
- `search`: 키워드 검색 (expression + meaning 대상)
- `sort`: newest (기본) / oldest / mastery_asc / mastery_desc

**PUT /api/vocab/{id}/mastery**
```json
// Request
{ "mastery": 1 }

// Response
{ "id": 1, "mastery": 1, "updated_at": "..." }
```

**GET /api/vocab/flashcard?category=idiom&direction=en_to_kr**
```json
// Response — mastery 낮은 순, 같은 레벨 내 셔플
[
  { "id": 1, "expression": "...", "meaning": "...", "example": "...", "category": "...", "mastery": 0 }
]
```

## 6. 프론트엔드 컴포넌트 구조

```
frontend/src/components/
├── vocab/
│   ├── VocabSaveModal.tsx          # 글로벌 저장 모달
│   ├── VocabSaveButton.tsx         # 플로팅 버튼 (우하단)
│   ├── VocabListView.tsx           # 리스트 뷰 (검색/필터/CRUD)
│   ├── VocabFlashcardView.tsx      # 플래시카드 뷰
│   ├── VocabCard.tsx               # 개별 카드 컴포넌트 (리스트용)
│   └── FlashCard.tsx               # 플래시카드 컴포넌트 (뒤집기 애니메이션)
├── analytics/
│   └── ... (기존 유지)
└── ...
```

### 6.1 글로벌 레이아웃 변경 (App.tsx)

- `VocabSaveButton` (플로팅 버튼)을 App.tsx 최상단에 항상 렌더링
- 모달 상태는 App.tsx 레벨에서 관리
- `Cmd+Shift+S` 단축키 이벤트 리스너 등록

### 6.2 Analytics 탭 서브탭 추가

```
기존: Analytics → 사이드바(차트/이력/표현) + ChatPanel
변경: Analytics → [오류분석 | 표현노트] 서브탭
  - 오류분석: 기존 레이아웃 유지
  - 표현노트: [리스트 | 플래시카드] 뷰 토글
```

## 7. 엣지 케이스

| 상황 | 처리 |
|------|------|
| 중복 표현 저장 시도 | 동일 expression 존재 시 "이미 저장된 표현입니다" 경고 + 덮어쓰기 여부 확인 |
| 표현 노트 비어있을 때 | 빈 상태 안내 + "플로팅 버튼으로 첫 표현을 저장해보세요" |
| 플래시카드 0개일 때 | "저장된 표현이 없습니다" 안내 |
| 모든 카드가 mastery 3(외움)일 때 | "모든 표현을 외웠습니다!" + 전체 리셋 옵션 |
| 긴 표현/예문 | 텍스트 잘림 처리 (리스트: 2줄, 카드: 스크롤) |

## 8. 키보드 단축키

| 단축키 | 동작 |
|--------|------|
| `Cmd+Shift+S` | 저장 모달 열기/닫기 |
| `Esc` | 모달 닫기 |
| `Enter` (모달 내) | 저장 실행 (필수 필드 채워진 경우) |
| `Space` (플래시카드) | 카드 뒤집기 |
| `←` / `→` (플래시카드) | 이전/다음 카드 |
| `1` / `2` / `3` (플래시카드) | 모르겠어요 / 애매해요 / 알아요! |
| `4` (플래시카드) | 외웠어요! (mastery 3으로 설정, 카드 제거) |

## 9. 구현 우선순위

### Phase 1 (MVP)
- [ ] `vocab_entries` 테이블 생성
- [ ] CRUD API 엔드포인트
- [ ] VocabSaveButton + VocabSaveModal (글로벌)
- [ ] VocabListView (검색/필터/편집/삭제)
- [ ] Analytics 탭 서브탭 구조 변경

### Phase 2 (플래시카드)
- [ ] VocabFlashcardView + FlashCard 컴포넌트
- [ ] mastery 업데이트 API 연동
- [ ] 카드 셔플 + mastery 기반 정렬
- [ ] 키보드 단축키 (플래시카드 내비게이션)

### Phase 2.5 (외움 기능)
- [ ] 플래시카드 API에서 mastery >= 3 제외
- [ ] "외웠어요!" 버튼 + 키보드 단축키(4)
- [ ] 외운 카드 즉시 세션에서 제거
- [ ] 리스트뷰 "외움" 배지 + "다시 학습" 버튼
- [ ] 빈 플래시카드 상태: "모든 표현을 외웠습니다!" + 리셋

### Phase 3 (고도화)
- [ ] 중복 표현 감지 + 경고
- [ ] 카드 뒤집기 애니메이션 (CSS 3D transform)
- [ ] mastery 통계 (숙달률 차트)
- [ ] 표현 노트에서 AI 대화 복습 연동

## 10. 의존성

- 기존 `lessons` 테이블 (FK 관계, ON DELETE SET NULL)
- App.tsx 레벨의 글로벌 상태 (모달 열림/닫힘)
- Analytics 탭 레이아웃 변경 (서브탭 추가)
- 키보드 이벤트 리스너 (글로벌)
