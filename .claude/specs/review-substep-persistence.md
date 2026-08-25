# Review 서브스텝 상태 유지

## 목적

Review 모드 내 서브스텝(input / summary / drill / writing)을 전환할 때 각 스텝의 채팅 메시지와 입력 필드 내용이 초기화되지 않고 유지되도록 한다.

## 현재 문제

1. `handleGoToDrill`/`handleGoToWriting`에서 `clear()` + `resetChat()` 호출 → 채팅 히스토리 삭제
2. `input`과 `writing` 스텝이 하나의 useChat 인스턴스 공유 → 맥락 혼재
3. 조건부 렌더링으로 컴포넌트 unmount → FeedbackInput의 `feedbackText` 등 로컬 state 소멸

## 해결 방안

### 채팅 상태

- `input`과 `writing` 스텝에 독립 useChat 인스턴스: `useChat("review:input")`, `useChat("review:writing")`
- 스텝 전환 시 `clear()` / `resetChat()` 제거

### 입력 필드 상태

- always-mount + CSS display 토글로 컴포넌트 unmount 방지
- FeedbackInput의 `feedbackText`, RecordingUpload의 `status` 등 자연 유지

### 비채팅 스텝 (summary, drill)

- corrections, drills, reportMarkdown 등은 ReviewPanel의 useState → 이미 유지됨 (ReviewPanel은 항상 마운트)
- 별도 useChat 불필요

## UI 동작

| 사용자 행동 | 기대 결과 |
|------------|-----------|
| input에서 피드백 분석 채팅 → summary 이동 | input 채팅 유지 |
| summary에서 drill 이동 → input 복귀 | input 채팅 + 피드백 텍스트 유지 |
| writing에서 작문 채팅 → drill 이동 → writing 복귀 | writing 채팅 유지 |
| review → prep → review 복귀 | 모든 서브스텝 상태 유지 |

## 변경 범위

| 파일 | 변경 |
|------|------|
| `frontend/src/App.tsx` | `reviewChat` 1개 → `reviewInputChat`, `reviewWritingChat` 2개 |
| `frontend/src/components/review/ReviewPanel.tsx` | Props 변경, always-mount, 스텝별 chat, clear/resetChat 제거 |
| `frontend/tests/review-substep-persistence.test.tsx` | 서브스텝 전환 테스트 |
