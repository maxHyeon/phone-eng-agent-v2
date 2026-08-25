# 수업 전 준비 모드 개선 — 구현 계획

**Status**: Completed (2026-04-15)

## 변경 파일

| 파일 | 변경 |
|------|------|
| `frontend/src/types/index.ts` | `PrepStep` 타입 추가 |
| `frontend/src/components/prep/DailyStoryInput.tsx` | 신규 — Step 1 사이드바 |
| `frontend/src/components/prep/PrepPanel.tsx` | 신규 — 3단계 오케스트레이터 |
| `frontend/src/App.tsx` | prep 모드에서 PrepPanel 렌더링 |
| `backend/app/agent/prompts.py` | 프리토킹 섹션 추가 |
| `frontend/src/components/prep/SmalltalkPanel.tsx` | 삭제 |
| `frontend/src/components/prep/StoryPrep.tsx` | 삭제 |

## 관련 스펙

- `.claude/specs/prep-mode-step-flow.md`
