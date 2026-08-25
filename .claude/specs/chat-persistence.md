# 모드 탭 전환 시 채팅 유지

**Status**: Implemented (2026-04-21)

## 개요

prep / review / analytics 모드 탭을 전환해도 각 모드의 채팅 메시지가 사라지지 않고 그대로 유지되어야 한다.

## 현재 문제

1. PrepPanel, ReviewPanel이 각각 내부에서 `useChat()` 호출 → 컴포넌트 unmount 시 상태 소멸
2. CSS hidden으로 unmount를 방지해도, 채팅 상태가 자식 컴포넌트에 있어 구조적으로 취약

## 목표 동작

| 시나리오 | 기대 결과 |
|----------|-----------|
| prep에서 채팅 → review 탭 → prep 복귀 | prep 채팅 그대로 유지 |
| review에서 채팅 → analytics 탭 → review 복귀 | review 채팅 그대로 유지 |
| prep 내부 스텝 전환 (smalltalk → article) | 채팅 초기화 (기존 동작 유지) |
| review 내부 스텝 전환 (drill → writing) | 채팅 초기화 (기존 동작 유지) |

## 설계 원칙

- 채팅 상태를 App 레벨에서 관리 (모드별 독립 인스턴스)
- 자식 패널은 props로 채팅 인터페이스를 받아 사용
- 백엔드 대화 히스토리도 mode별로 분리
