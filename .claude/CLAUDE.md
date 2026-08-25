# Phone English Agent v2 — Steering Document

## Project Overview

전화영어 수업 전후 30분을 AI로 코칭하는 로컬 Mac 앱.
수업 전 준비(스몰톡 + 기사 분석 + 프리토킹)와 수업 후 복습(녹음 전사 + 오류 첨삭 + 드릴 + 자유 작문)을 체계적으로 지원한다.

## Development Methodology: SDD (Spec-Driven Development)

모든 기능 개발은 **스펙 → 테스트 → 구현 → 문서** 순서를 따른다.

### 원칙

1. **Spec First**: 기능 구현 전 `.claude/specs/` 아래에 스펙 문서를 먼저 작성한다.
   - 스펙에는 목적, 입출력, UI 동작, 에이전트 도구 매핑, 데이터 모델 변경 사항을 포함한다.
2. **Test First**: 스펙이 확정되면 **테스트를 먼저 작성**하고 구현을 진행한다.
   - Backend: pytest 기반 단위/통합 테스트
   - Frontend: vitest 기반 컴포넌트/훅 테스트
   - 테스트가 실패하는 상태에서 구현을 시작하고, 구현 완료 시 테스트가 통과해야 한다.
3. **Plan Before Code**: 비자명한 구현은 `.claude/plans/` 아래에 구현 계획을 작성한다.
   - 변경 파일 목록, 구현 상세, 의존성, 검증 방법을 포함한다.
4. **Document on Completion**: 기능 단위 구현 완료 시 아래 문서를 업데이트한다.
   - `README.md` (프로젝트 루트) — 기능 설명, 실행 방법 반영
   - Obsidian 진행상황 문서 — 기능 히스토리 업데이트 (아래 경로 참조)

### 문서 구조

```
.claude/
├── CLAUDE.md              # 이 파일 (스티어링 문서)
├── specs/                 # 기능 스펙 문서
│   ├── base-spec.md       # 전체 프로덕트 스펙 (SSOT)
│   └── {feature}.md       # 개별 기능 스펙
└── plans/                 # 구현 계획 문서
    └── {feature}.md       # 개별 구현 계획
```


## Tech Stack

| 영역 | 기술 |
|------|------|
| Backend | Python 3.11+ / FastAPI / Anthropic SDK / SQLite |
| Frontend | React 19 / TypeScript / Vite / Tailwind CSS 4 |
| AI | Claude API (Anthropic Direct + AWS Bedrock) |
| 음성 전사 | mlx-whisper (Apple Silicon) |
| 이미지 OCR | Claude Vision API |
| 차트 | Recharts |
| 패키지 관리 | uv (backend) / npm (frontend) |

## Project Structure

```
phone-eng-agent-v2/
├── .claude/               # 스티어링, 스펙, 플랜
├── backend/
│   ├── app/
│   │   ├── agent/         # AI 에이전트 (루프, 프롬프트, 도구)
│   │   ├── routes/        # API 엔드포인트
│   │   ├── services/      # DB, Whisper, 파일 파서
│   │   ├── config.py      # 환경변수 + 멀티 프로바이더
│   │   ├── ai_client.py   # Anthropic/Bedrock 클라이언트 팩토리
│   │   ├── database.py    # SQLite 스키마
│   │   ├── models.py      # Pydantic 모델
│   │   └── main.py        # FastAPI 앱
│   ├── tests/             # pytest 테스트
│   ├── data/              # SQLite DB
│   ├── uploads/           # 녹음 파일
│   └── reports/           # 리뷰 리포트 (md)
├── frontend/
│   ├── src/
│   │   ├── api/           # REST + SSE 클라이언트
│   │   ├── hooks/         # useChat, useLesson, useVoiceInput
│   │   ├── components/    # chat, prep, review, analytics, settings
│   │   └── types/         # TypeScript 타입
│   └── tests/             # vitest 테스트
└── README.md
```

## Running the Project

```bash
# Backend
cd backend && .venv/bin/python main.py    # http://localhost:8000

# Frontend
cd frontend && npm run dev                 # http://localhost:5173
```

## Conventions

- 설명/지시는 한국어, 코드/커밋 메시지는 영어
- Backend: snake_case, Frontend: camelCase
- API 엔드포인트: `/api/` 접두사
- 에이전트 모드: `prep` / `review` / `analytics`
- SSE 스트리밍: `event: text_delta|tool_start|tool_result|done`
