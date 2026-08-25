# Review 서브스텝 상태 유지 — 구현 계획

**Status**: Completed (2026-04-22)

## 관련 스펙

- `.claude/specs/review-substep-persistence.md`

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `frontend/src/App.tsx` | `reviewChat` → `reviewInputChat`, `reviewWritingChat` |
| `frontend/src/components/review/ReviewPanel.tsx` | always-mount + display toggle, 스텝별 chat, clear/resetChat 제거 |
| `frontend/tests/review-substep-persistence.test.tsx` | 서브스텝 전환 시 상태 유지 테스트 |

## 구현 상세

### 1. App.tsx

```tsx
const reviewInputChat = useChat("review:input");
const reviewWritingChat = useChat("review:writing");

<ReviewPanel
  lesson={lesson}
  chats={{ input: reviewInputChat, writing: reviewWritingChat }}
/>
```

### 2. ReviewPanel.tsx

- Props: `chat: UseChatReturn` → `chats: { input: UseChatReturn; writing: UseChatReturn }`
- 4개 스텝 모두 always-mount + `style={{ display }}`
- `handleGoToDrill`: `loadData()` + `setStep("drill")` (clear 제거)
- `handleGoToWriting`: `setStep("writing")` (clear 제거)
- input 스텝: `chats.input` 사용
- writing 스텝: `chats.writing` 사용
- summary/drill: 채팅 미사용 (기존 data state 유지)

### 3. 백엔드

기존 `_conv_key`가 mode를 그대로 사용하므로 `"review:input"`, `"review:writing"` 자동 지원. 변경 불필요.

## 검증

- input에서 피드백 텍스트 입력 → summary → input 복귀 → 텍스트 유지
- input에서 채팅 → drill → input → 채팅 유지
- writing에서 채팅 → drill → writing → 채팅 유지
- review → prep → review → 모든 서브스텝 유지
