# 수업 이력 저장 및 불러오기

## 목적

1. 수업에서 진행한 채팅 대화를 DB에 영구 저장하여 서버 재시작 후에도 유지
2. 학습 기록 사이드바에서 과거 수업을 클릭하면, 현재 수업 내용을 저장하고 선택한 수업의 데이터를 불러오기

## 현재 상태

| 데이터 | 저장 여부 | 저장 위치 |
|--------|-----------|-----------|
| 토픽, 기사, 질문 | O | lessons 테이블 (topic, script_text, questions) |
| 녹음 파일 | O | recordings 테이블 + uploads/ 디렉터리 |
| 교정, 드릴, 표현 | O | corrections, drill_sessions, expressions 테이블 |
| **채팅 대화** | **X** | **메모리만 (_conversations dict)** |

## 변경 사항

### 1. 대화 로그 영구 저장

#### 데이터 모델

```sql
CREATE TABLE IF NOT EXISTS conversation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    mode TEXT NOT NULL,
    messages TEXT NOT NULL,  -- JSON array of ChatMessage[]
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(lesson_id, mode)
);
```

- `mode`: `prep:smalltalk`, `prep:article`, `prep:freetalk`, `review:input`, `review:writing`, `analytics`
- `messages`: JSON 직렬화된 `[{role, content, toolEvents?}]`

#### API 엔드포인트

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/api/lessons/{id}/conversations` | PUT | 수업의 모든 대화 저장 (upsert) |
| `/api/lessons/{id}/conversations` | GET | 수업의 저장된 대화 조회 |

### 2. 수업 이력 불러오기

#### UI 플로우

1. 사용자가 학습 기록 사이드바의 수업 이력에서 항목 클릭
2. 확인 모달: "기존 내용을 저장하고 이 수업의 기록을 불러오시겠습니까?"
3. "예" 클릭 시:
   a. 현재 수업의 대화를 DB에 저장
   b. 모든 채팅 스토어 초기화
   c. 선택한 수업 데이터 로드 (lesson 객체 교체)
   d. 저장된 대화를 채팅 스토어에 로드
4. "아니오" 클릭 시: 모달 닫기, 변경 없음

#### 헤더 표시

- 과거 수업 조회 중일 때 헤더에 "오늘 수업으로 돌아가기" 버튼 표시

#### useLesson 확장

```typescript
// 기존
{ lesson, loading, updateLesson }

// 확장
{ lesson, loading, updateLesson, switchLesson, isHistorical }
```

- `switchLesson(lessonId)`: 지정 수업으로 전환
- `isHistorical`: 현재 수업이 오늘이 아닌 과거 수업인지 여부

#### useChat 확장

```typescript
// 새 export 함수
_loadStore(key: string, messages: ChatMessage[]): void  // 스토어에 메시지 로드
_getStoreMessages(key: string): ChatMessage[]  // 스토어에서 메시지 추출
```

## 변경 범위

| 파일 | 변경 |
|------|------|
| `backend/app/database.py` | conversation_logs 테이블 추가 |
| `backend/app/services/db_service.py` | save_conversation_logs, get_conversation_logs |
| `backend/app/routes/lessons.py` | PUT/GET conversations 엔드포인트 |
| `backend/app/models.py` | ConversationSaveRequest 모델 |
| `frontend/src/api/client.ts` | saveConversations, getConversations |
| `frontend/src/hooks/useChat.ts` | _loadStore, _getStoreMessages export |
| `frontend/src/hooks/useLesson.ts` | switchLesson, isHistorical |
| `frontend/src/components/analytics/LessonHistory.tsx` | onSelect callback, 클릭 가능 UI |
| `frontend/src/components/common/ConfirmModal.tsx` | 확인 모달 컴포넌트 |
| `frontend/src/App.tsx` | 수업 전환 플로우 연결 |
