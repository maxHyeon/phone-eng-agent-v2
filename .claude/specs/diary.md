# Feature Spec: 영어 일기장 (English Diary)

## 1. 목적

수업 전 준비의 일상 이야기에서 생성된 영어 표현들을 날짜별로 모아 **일기장** 형태로 열람하고, 수업 없는 날에도 **직접 영어 일기를 작성**하여 AI 교정을 받을 수 있는 기능.

## 2. 핵심 요구사항

| 항목 | 결정 |
|------|------|
| 표시 내용 | 내 입력 + AI 교정 (간결하게) |
| UI 위치 | 학습기록(Analytics) 탭 서브탭: 오류분석 / 표현노트 / **일기장** |
| 탐색 방식 | 월간 캘린더 (일기 있는 날짜 도트 표시) + 선택 시 해당 날짜 일기 표시 |
| 편집 기능 | 메모 추가 가능 + 직접 일기 작성 (한국어/영어 자유 입력 → AI 교정) |

## 3. 데이터 소스

### 3.1 기존 데이터 (수업에서 자동 수집)

| 테이블 | 용도 |
|--------|------|
| `daily_stories` | 일상 이야기에서 생성된 입력(korean_input) + 교정(english_output) |
| `smalltalk_scenarios` | 스몰톡 시나리오의 입력(user_input_kr) + 교정(english_output) |

### 3.2 새 테이블: `diary_entries`

직접 작성한 일기 및 메모를 저장하기 위한 별도 테이블.

```sql
CREATE TABLE IF NOT EXISTS diary_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    user_input TEXT NOT NULL,
    ai_output TEXT,
    memo TEXT,
    source TEXT NOT NULL DEFAULT 'manual',  -- 'manual' / 'lesson'
    lesson_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
);
```

**source 필드:**
- `'lesson'`: 수업 데이터에서 자동으로 가져온 항목 (daily_stories/smalltalk에서 복사)
- `'manual'`: 사용자가 직접 작성한 일기

### 3.3 데이터 마이그레이션 전략

수업 시 생성되는 daily_stories/smalltalk 데이터를 diary_entries로 **자동 복사하지 않는다.**
대신 일기장 조회 시 두 소스를 합쳐서 보여준다:
1. `diary_entries` (직접 작성 + 메모)
2. `daily_stories` + `smalltalk_scenarios` (수업에서 자동 생성)

날짜 기준으로 합산하여 하나의 타임라인으로 렌더링.

## 4. API 설계

### 4.1 새 엔드포인트

```
GET    /api/diary                    — 일기 목록 (날짜 범위 필터)
GET    /api/diary/dates              — 일기 존재하는 날짜 목록 (캘린더 도트용)
GET    /api/diary/{date}             — 특정 날짜의 일기 상세
POST   /api/diary                    — 일기 직접 작성
PUT    /api/diary/{id}/memo          — 메모 추가/수정
DELETE /api/diary/{id}               — 직접 작성한 일기 삭제
```

### 4.2 요청/응답 상세

**GET /api/diary/dates?year=2026&month=5**
```json
// Response: 일기가 존재하는 날짜 배열
["2026-05-07", "2026-05-08", "2026-05-10", "2026-05-14", "2026-05-18"]
```

조회 로직:
- `diary_entries`의 date
- `lessons` JOIN `daily_stories` 또는 `smalltalk_scenarios`가 있는 lessons.date
- 중복 제거 후 반환

**GET /api/diary/2026-05-14**
```json
{
  "date": "2026-05-14",
  "entries": [
    {
      "id": 1,
      "source": "lesson",
      "user_input": "어제 부모님이 우리 집에 오셔서 아기랑 놀았어요",
      "ai_output": "My parents came to our house yesterday and played with the baby.",
      "memo": null,
      "created_at": "2026-05-14T09:00:00"
    },
    {
      "id": 2,
      "source": "manual",
      "user_input": "Today I tried a new coffee shop near my office.",
      "ai_output": "Today I tried a new coffee shop near my office. The latte was surprisingly good!",
      "memo": "점심시간에 발견한 카페, 다음에 또 가야지",
      "created_at": "2026-05-14T20:00:00"
    }
  ]
}
```

**POST /api/diary**
```json
// Request
{
  "date": "2026-05-20",
  "user_input": "오늘 날씨가 좋아서 점심시간에 산책했다",
  "memo": "기분 전환됨"  // optional
}

// Response: AI 교정 포함
{
  "id": 5,
  "date": "2026-05-20",
  "user_input": "오늘 날씨가 좋아서 점심시간에 산책했다",
  "ai_output": "The weather was so nice today that I went for a walk during my lunch break.",
  "memo": "기분 전환됨",
  "source": "manual",
  "lesson_id": null,
  "created_at": "2026-05-20T21:00:00"
}
```

AI 교정 처리:
- POST 시 사용자 입력을 Claude API로 전송하여 자연스러운 영어로 교정
- 기존 `polish_english` 에이전트 도구와 동일한 프롬프트 사용
- 응답에 교정 결과를 포함하여 반환 + DB 저장

**PUT /api/diary/{id}/memo**
```json
// Request
{ "memo": "이 표현 다음에 수업에서 써봐야겠다" }

// Response
{ "id": 1, "memo": "이 표현 다음에 수업에서 써봐야겠다", "updated_at": "..." }
```

## 5. UI 설계

### 5.1 위치

학습기록 탭 서브탭:
```
[ 오류분석 | 표현노트 | 일기장 ]
```

### 5.2 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  [ 오류분석 | 표현노트 | 일기장 ]                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ 캘린더 (좌측) ────────┐  ┌─ 일기 내용 (우측) ────┐ │
│  │    2026년 5월    < >    │  │ 📅 2026-05-14 (목)    │ │
│  │ 일 월 화 수 목 금 토    │  │                       │ │
│  │          1  2  3        │  │ ┌─ 수업 ───────────┐  │ │
│  │  4  5  6  ●  ●  9 10   │  │ │ 내 입력:          │  │ │
│  │ 11 12 13 ● 15 16 17    │  │ │ 어제 부모님이...  │  │ │
│  │ ● 19 20 21 22 23 24    │  │ │                   │  │ │
│  │ 25 26 27 28 29 30 31   │  │ │ AI 교정:          │  │ │
│  │                         │  │ │ My parents came...│  │ │
│  │ ● = 일기 있는 날        │  │ └───────────────────┘  │ │
│  └─────────────────────────┘  │                       │ │
│                                │ ┌─ 직접 작성 ──────┐  │ │
│  ┌─ 일기 쓰기 ────────────┐  │ │ 내 입력:          │  │ │
│  │ [한국어/영어 자유 입력] │  │ │ Today I tried...  │  │ │
│  │ ┌───────────────────┐  │  │ │                   │  │ │
│  │ │                   │  │  │ │ AI 교정:          │  │ │
│  │ │                   │  │  │ │ Today I tried a   │  │ │
│  │ └───────────────────┘  │  │ │ new coffee shop...│  │ │
│  │ 메모 (선택):            │  │ │                   │  │ │
│  │ [________________]     │  │ │ 메모: 점심시간에...│  │ │
│  │              [작성하기] │  │ └───────────────────┘  │ │
│  └─────────────────────────┘  └───────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 5.3 캘린더 컴포넌트

- 월간 그리드 (7x5~6)
- 일기 있는 날짜에 파란 도트 표시
- 선택된 날짜 하이라이트
- `< >` 버튼으로 월 이동
- 클릭 시 우측에 해당 날짜 일기 표시

### 5.4 일기 내용 (우측)

- 날짜 선택 시 해당 날짜의 모든 entry 표시
- 각 entry에 source 배지 (수업/직접작성)
- 내 입력 → AI 교정 쌍으로 표시
- 메모가 있으면 함께 표시
- 메모 추가/수정 버튼 (인라인 편집)
- 직접 작성 일기는 삭제 가능

### 5.5 일기 작성 (좌측 하단 또는 우측 상단)

- 텍스트 영역: 한국어/영어 자유 입력
- 메모 입력 (선택)
- "작성하기" 버튼 → API 호출 → AI 교정 결과 수신 → 목록에 추가
- 날짜는 캘린더에서 선택된 날짜 (기본: 오늘)

## 6. 프론트엔드 컴포넌트 구조

```
frontend/src/components/diary/
├── DiaryTab.tsx             # 메인 컨테이너 (캘린더 + 일기내용)
├── DiaryCalendar.tsx        # 월간 캘린더 컴포넌트
├── DiaryEntryList.tsx       # 선택된 날짜의 일기 목록
├── DiaryEntryCard.tsx       # 개별 일기 카드 (입력+교정+메모)
└── DiaryWriteForm.tsx       # 일기 작성 폼
```

## 7. 엣지 케이스

| 상황 | 처리 |
|------|------|
| 선택 날짜에 일기 없음 | "이 날짜에 기록이 없습니다" + 작성 유도 |
| AI 교정 실패 | user_input만 저장, ai_output=null, 나중에 재시도 가능 |
| 같은 날짜에 수업 데이터 + 직접 작성 혼재 | source 배지로 구분, 시간순 정렬 |
| 매우 긴 입력 | 텍스트 영역 자동 높이 조절, 카드에서는 접기/펼치기 |
| 과거 날짜에 일기 작성 | 캘린더에서 과거 날짜 선택 후 작성 가능 |

## 8. 구현 우선순위

### Phase 1 (MVP)
- [ ] `diary_entries` 테이블 생성
- [ ] API 엔드포인트 (dates, get by date, create, memo, delete)
- [ ] DiaryCalendar 컴포넌트
- [ ] DiaryEntryList + DiaryEntryCard (읽기)
- [ ] Analytics 서브탭 추가 (일기장)

### Phase 2 (작성 + AI 교정)
- [ ] DiaryWriteForm (입력 → AI 교정)
- [ ] AI 교정 API 연동 (Claude API 직접 호출)
- [ ] 메모 추가/수정 기능

### Phase 3 (고도화)
- [ ] 일기 내 표현을 표현노트로 저장하는 연동
- [ ] 일기 검색 (키워드)
- [ ] 일기 통계 (작성 빈도, 연속 작성일 streak)

## 9. 의존성

- 기존 `daily_stories`, `smalltalk_scenarios`, `lessons` 테이블 (읽기)
- Analytics 탭 서브탭 구조 (기존: 오류분석/표현노트 → 일기장 추가)
- Claude API (직접 작성 시 AI 교정용)
- 기존 `ai_client.py` 모듈 재활용
