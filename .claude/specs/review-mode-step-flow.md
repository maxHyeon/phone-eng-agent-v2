# 수업 후 복습 모드 — 4단계 플로우

**Status**: Implemented (2026-04-15)

## 개요

review 모드를 사이드바+채팅에서 **4단계 순차 플로우**로 전환.
분석 결과를 마크다운 파일로 저장하고, 단계별 진행.

## 단계

| Step | 이름 | 레이아웃 | 설명 |
|------|------|----------|------|
| 1 | 입력 | sidebar + chat | 녹음 업로드, 피드백 입력 |
| 2 | 분석 결과 | standalone | 오류 유형 분포, 교정 목록, 리포트 다운로드 |
| 3 | 드릴 연습 | standalone | 체크박스 기반 드릴 목록 |
| 4 | 자유 작문 | full-width chat | 배운 표현 활용 작문 연습 |

## 주요 파일

- `frontend/src/components/review/ReviewPanel.tsx`
- `frontend/src/components/review/RecordingUpload.tsx`
- `frontend/src/components/review/FeedbackInput.tsx`
- `backend/app/routes/report.py` (리포트 생성/다운로드)
