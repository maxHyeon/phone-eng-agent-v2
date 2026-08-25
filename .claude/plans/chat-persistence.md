# 채팅 유지 구현 계획

**Status**: Completed (2026-04-21)

## 관련 스펙

- `.claude/specs/chat-persistence.md`

## 핵심 전략

채팅 상태를 자식 컴포넌트(PrepPanel, ReviewPanel)에서 부모(App.tsx)로 끌어올린다. App 컴포넌트는 항상 마운트 상태이므로 모드 전환과 무관하게 상태가 유지된다.

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `frontend/src/App.tsx` | 모드별 useChat 3개 생성, props로 전달, always-mount + hidden |
| `frontend/src/hooks/useChat.ts` | `UseChatReturn` 타입 export |
| `frontend/src/components/prep/PrepPanel.tsx` | 내부 useChat 제거, `chat: UseChatReturn` prop |
| `frontend/src/components/review/ReviewPanel.tsx` | 내부 useChat 제거, `chat: UseChatReturn` prop |
| `backend/app/routes/chat.py` | _conv_key에 mode 포함, reset_chat을 Pydantic body로 수정 |
| `backend/app/models.py` | `ChatResetRequest` 모델 추가 |
| `frontend/src/api/client.ts` | resetChat에 mode 파라미터 |

## 구현 상세

### 1. App.tsx — 모드별 useChat 인스턴스

```tsx
const prepChat = useChat();
const reviewChat = useChat();
const analyticsChat = useChat();

<PrepPanel lesson={lesson} updateLesson={updateLesson} chat={prepChat} />
<ReviewPanel lesson={lesson} chat={reviewChat} />
```

### 2. PrepPanel — props 기반 채팅

- `useChat()` 호출 제거
- Props에 `chat: ReturnType<typeof useChat>` 추가
- `switchStep`에서 `chat.clear()` 호출 (스텝 내부 전환은 여전히 초기화)

### 3. ReviewPanel — props 기반 채팅

- `useChat()` 호출 제거
- Props에 `chat: ReturnType<typeof useChat>` 추가
- 스텝 전환 시 `chat.clear()` 호출 유지

### 4. CSS hidden 유지

이전에 적용한 always-mount + hidden 방식도 그대로 유지 (이중 안전장치).

## 검증

- prep에서 채팅 후 review 이동 → prep 복귀 → 메시지 유지 확인
- review에서 채팅 후 prep 이동 → review 복귀 → 메시지 유지 확인
- prep 내부 스텝 전환 → 채팅 초기화 확인
