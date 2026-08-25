# Review 모드 — 도구 전용 출력 (Tool-Only Output)

**Status**: In Progress (2026-04-22)

## 목적

Review 모드에서 에이전트가 분석 결과(교정, 드릴)를 **채팅 텍스트로 출력하지 않고**, 
반드시 도구 호출(`extract_corrections`, `generate_drill`)을 통해 DB에 저장하도록 강제한다.

## 문제

현재 `REVIEW_MODE_PROMPT`가 도구 사용을 "권장"하지만, 에이전트가 여전히 분석 결과를 
텍스트로 출력하는 경우가 빈번하다. 이 경우:
- DB에 데이터가 저장되지 않음
- 프론트엔드의 auto-navigation이 트리거되지 않음 (도구 이벤트 없음)
- 분석 결과/드릴 탭에 데이터가 표시되지 않음

## 요구사항

### 에이전트 동작 규칙

1. **분석 결과는 반드시 도구로만 출력**
   - 오류 교정 → `extract_corrections` 도구 호출 (DB 저장)
   - 드릴 생성 → `generate_drill` 도구 호출 (DB 저장)
   - 텍스트로 교정 목록이나 드릴을 나열하는 것은 **금지**

2. **채팅 텍스트는 최소한의 상태 메시지만**
   - 허용: "분석 중입니다...", "3개 오류를 발견했습니다. 드릴을 생성합니다.", "분석 완료"
   - 금지: 오류 상세 설명, 교정 목록, 드릴 문제 텍스트

3. **처리 순서**
   1. 입력 내용(녹음 전사/피드백) 분석
   2. `extract_corrections` 호출 — 모든 오류를 한 번에 전달
   3. `generate_drill` 호출 — 교정 기반 드릴 생성
   4. 간단한 완료 메시지 출력

### 프론트엔드 연동

- 도구 이벤트 감지 → auto-navigation → 분석 결과 탭
- 이미 구현됨 (ReviewPanel의 prevStreamingRef + ANALYSIS_TOOLS)

## 변경 범위

| 파일 | 변경 |
|------|------|
| `backend/app/agent/prompts.py` | `REVIEW_MODE_PROMPT` 전면 재작성 |
| `backend/tests/test_mode_splitting.py` | 프롬프트 내용 검증 테스트 추가 |

## 검증

- 프롬프트에 도구 전용 출력 관련 키워드 포함 여부 테스트
- curl로 실제 에이전트 호출 → 도구 호출 발생 확인 (수동)
- 기존 테스트 전체 통과
