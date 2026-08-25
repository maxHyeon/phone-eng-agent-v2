# 수업 전 준비 모드 — 3단계 플로우

**Status**: Implemented (2026-04-15)

## 개요

prep 모드를 사이드바+단일채팅에서 **3단계 순차 플로우**로 전환.

## 단계

| Step | 이름 | 레이아웃 | 사용 도구 |
|------|------|----------|-----------|
| 1 | 일상 이야기 | sidebar + chat | generate_smalltalk_scenario, polish_english |
| 2 | 기사 분석 | sidebar + chat | analyze_script, explain_expression |
| 3 | 프리토킹 | full-width chat | explain_expression |

## UI

```
[1. 일상 이야기]  [2. 기사 분석]  [3. 프리토킹]
```

- 단계 전환 시 대화 초기화
- Step 1: 요일 컨텍스트 + 텍스트/음성 입력 → Agent 스몰톡 연습
- Step 2: TopicInput (토픽/기사/질문) → Agent 분석
- Step 3: lesson.questions 컨텍스트 자동 주입 → 자유 대화

## 주요 파일

- `frontend/src/components/prep/PrepPanel.tsx`
- `frontend/src/components/prep/DailyStoryInput.tsx`
- `frontend/src/components/prep/TopicInput.tsx` (기존 재사용)
- `backend/app/agent/prompts.py` (프리토킹 섹션 추가)
