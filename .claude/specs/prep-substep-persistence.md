# Prep 서브스텝 상태 유지

## 목적

Prep 모드 내 서브스텝(smalltalk / article / freetalk)을 전환할 때 각 스텝의 채팅 메시지와 입력 필드 내용이 초기화되지 않고 유지되도록 한다.

## 현재 문제

1. `switchStep`에서 `clear()` + `resetChat()` 호출 → 채팅 히스토리 삭제
2. 조건부 렌더링(`{step === "smalltalk" && ...}`)으로 컴포넌트 unmount → 로컬 useState 소멸
3. 3개 스텝이 하나의 useChat 인스턴스를 공유 → 스텝 전환 시 대화 맥락 혼재

## 해결 방안

### 채팅 상태

- 각 스텝별 독립 useChat 인스턴스: `useChat("prep:smalltalk")`, `useChat("prep:article")`, `useChat("prep:freetalk")`
- `switchStep`에서 `clear()` / `resetChat()` 제거

### 입력 필드 상태

- always-mount + CSS display 토글로 컴포넌트 unmount 방지
- DailyStoryInput, TopicInput의 로컬 useState가 자연스럽게 유지됨

### 백엔드 대화 키

- `_conv_key`에 서브스텝 포함: `{lesson_id}:prep:smalltalk` 형태
- ChatRequest.mode에 `"prep:smalltalk"` 등 복합 모드 전달

## UI 동작

| 사용자 행동 | 기대 결과 |
|------------|-----------|
| smalltalk에서 채팅 후 article 이동 | smalltalk 채팅 유지 |
| article에서 입력 작성 후 freetalk 이동 | article 입력 필드 유지 |
| freetalk에서 대화 후 smalltalk 복귀 | freetalk 채팅 유지, smalltalk도 유지 |
| prep → review → prep 복귀 | 모든 서브스텝 상태 유지 |

## 변경 범위

| 파일 | 변경 |
|------|------|
| `frontend/src/App.tsx` | 단일 prepChat 대신 3개 스텝별 chat 전달 |
| `frontend/src/components/prep/PrepPanel.tsx` | always-mount, 스텝별 chat, switchStep 단순화 |
| `frontend/src/api/client.ts` | streamChat/resetChat mode에 서브스텝 키 포함 |
| `backend/app/routes/chat.py` | 복합 mode 키 지원 (기존 `_conv_key` 그대로 동작) |
| `frontend/tests/prep-substep-persistence.test.tsx` | 서브스텝 전환 테스트 |
