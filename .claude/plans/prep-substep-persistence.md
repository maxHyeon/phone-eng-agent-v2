# Prep 서브스텝 상태 유지 — 구현 계획

**Status**: Completed (2026-04-21)

## 관련 스펙

- `.claude/specs/prep-substep-persistence.md`

## 핵심 전략

1. App.tsx에서 3개 스텝별 useChat 인스턴스 생성, PrepPanel에 전달
2. PrepPanel에서 조건부 렌더링을 always-mount + `style={{ display }}` 토글로 교체
3. `switchStep`에서 `clear()` / `resetChat()` 제거

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `frontend/src/App.tsx` | `prepChat` 1개 → `prepSmalltalkChat`, `prepArticleChat`, `prepFreetalkChat` 3개 |
| `frontend/src/components/prep/PrepPanel.tsx` | Props 변경, always-mount, 스텝별 chat 연결 |
| `frontend/tests/prep-substep-persistence.test.tsx` | 서브스텝 전환 시 상태 유지 테스트 |

## 구현 상세

### 1. App.tsx

```tsx
const prepSmalltalkChat = useChat("prep:smalltalk");
const prepArticleChat = useChat("prep:article");
const prepFreetalkChat = useChat("prep:freetalk");

<PrepPanel
  lesson={lesson}
  updateLesson={updateLesson}
  chats={{ smalltalk: prepSmalltalkChat, article: prepArticleChat, freetalk: prepFreetalkChat }}
/>
```

### 2. PrepPanel.tsx

```tsx
interface Props {
  lesson: Lesson | null;
  updateLesson: (data: Partial<Lesson>) => Promise<Lesson | undefined>;
  chats: Record<PrepStep, UseChatReturn>;
}

// switchStep → setStep만 호출 (clear/resetChat 제거)

// 렌더링: always-mount + display toggle
<div style={{ display: step === "smalltalk" ? "flex" : "none" }} className="flex-1">
  <DailyStoryInput ... />
  <ChatPanel messages={chats.smalltalk.messages} ... />
</div>
<div style={{ display: step === "article" ? "flex" : "none" }} className="flex-1">
  <TopicInput ... />
  <ChatPanel messages={chats.article.messages} ... />
</div>
<div style={{ display: step === "freetalk" ? "flex" : "none" }} className="flex-1">
  <ChatPanel messages={chats.freetalk.messages} ... />
</div>
```

### 3. 백엔드

기존 `_conv_key`가 `f"{base}:{mode}"` 형태이므로 mode에 `"prep:smalltalk"` 등을 보내면 자동으로 `"6:prep:smalltalk"` 키가 생성된다. 추가 백엔드 변경 불필요.

## 검증

- smalltalk에서 채팅 → article 이동 → smalltalk 복귀 → 메시지 유지
- article에서 토픽 입력 → freetalk 이동 → article 복귀 → 입력 유지
- prep → review → prep 복귀 → 모든 서브스텝 상태 유지
