# 수업 이력 저장/불러오기 — 구현 계획

**Status**: Completed (2026-04-22)

## 관련 스펙

- `.claude/specs/lesson-history.md`

## 구현 순서

### Phase 1: Backend — 대화 저장 인프라

1. **database.py**: `conversation_logs` 테이블 추가
2. **db_service.py**: `save_conversation_logs()`, `get_conversation_logs()` 함수
3. **models.py**: `ConversationSaveRequest` Pydantic 모델
4. **routes/lessons.py**: PUT/GET `/lessons/{id}/conversations` 엔드포인트
5. **tests**: pytest 테스트

### Phase 2: Frontend — 채팅 스토어 확장

1. **useChat.ts**: `_loadStore()`, `_getStoreMessages()` export
2. **client.ts**: `saveConversations()`, `getConversations()` API 함수
3. **tests**: useChat 스토어 로드 테스트

### Phase 3: Frontend — 수업 전환 UI

1. **useLesson.ts**: `switchLesson()`, `isHistorical` 추가
2. **ConfirmModal.tsx**: 범용 확인 모달
3. **LessonHistory.tsx**: 클릭 가능, onSelect callback
4. **App.tsx**: 수업 전환 플로우 통합
5. **tests**: 수업 전환 통합 테스트

## 구현 상세

### Backend

```python
# database.py — 테이블 추가
CREATE TABLE IF NOT EXISTS conversation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    mode TEXT NOT NULL,
    messages TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(lesson_id, mode)
);

# db_service.py
def save_conversation_logs(lesson_id, conversations):
    # conversations: dict[str, list[dict]]  (mode → messages)
    for mode, messages in conversations.items():
        db.execute("""
            INSERT INTO conversation_logs (lesson_id, mode, messages, updated_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(lesson_id, mode) DO UPDATE SET messages = ?, updated_at = datetime('now')
        """, ...)

def get_conversation_logs(lesson_id):
    # returns dict[str, list[dict]]

# models.py
class ConversationSaveRequest(BaseModel):
    conversations: dict[str, list[dict]]
```

### Frontend — useChat 확장

```typescript
// useChat.ts
export function _loadStore(key: string, messages: ChatMessage[]) {
  stores.set(key, { messages, isStreaming: false });
  listeners.forEach(l => l());
}

export function _getStoreMessages(key: string): ChatMessage[] {
  return getState(key).messages;
}
```

### Frontend — 수업 전환 플로우 (App.tsx)

```typescript
const CHAT_KEYS = [
  "prep:smalltalk", "prep:article", "prep:freetalk",
  "review:input", "review:writing", "analytics"
];

const handleLessonSelect = async (selectedLesson: Lesson) => {
  if (selectedLesson.id === lesson?.id) return;
  setConfirmModal({
    open: true,
    lesson: selectedLesson,
  });
};

const handleConfirmSwitch = async () => {
  // 1. Save current conversations
  const conversations: Record<string, ChatMessage[]> = {};
  for (const key of CHAT_KEYS) {
    const msgs = _getStoreMessages(key);
    if (msgs.length > 0) conversations[key] = msgs;
  }
  if (lesson && Object.keys(conversations).length > 0) {
    await saveConversations(lesson.id, conversations);
  }

  // 2. Clear all stores
  _resetAllStores();

  // 3. Switch lesson
  switchLesson(selectedLesson.id);

  // 4. Load saved conversations
  const saved = await getConversations(selectedLesson.id);
  for (const [key, msgs] of Object.entries(saved)) {
    _loadStore(key, msgs);
  }
};
```

## 검증

- 수업에서 채팅 → 다른 수업 선택 → 모달 확인 → 원래 수업 복귀 → 채팅 유지
- 서버 재시작 후에도 저장된 대화 로드 가능
- 오늘 수업 ↔ 과거 수업 전환 시 각각의 데이터 독립 유지
