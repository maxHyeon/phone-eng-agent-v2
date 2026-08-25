# 수업 후 복습 모드 개선 — 구현 계획

**Status**: Completed (2026-04-15)

## 변경 파일

| 파일 | 변경 |
|------|------|
| `frontend/src/types/index.ts` | `ReviewStep` 타입 추가 |
| `frontend/src/components/review/ReviewPanel.tsx` | 신규 — 4단계 오케스트레이터 |
| `frontend/src/App.tsx` | review 모드에서 ReviewPanel 렌더링 |
| `backend/app/routes/report.py` | 신규 — 리포트 생성/다운로드 API |
| `backend/app/main.py` | report 라우터 등록 |
| `frontend/src/api/client.ts` | generateReport, downloadReport 추가 |

## 관련 스펙

- `.claude/specs/review-mode-step-flow.md`
