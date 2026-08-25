"""Tests for sub-mode splitting in tools and prompts.

When the frontend sends modes like "review:input" or "prep:smalltalk",
the backend must extract the base mode ("review", "prep") to select
the correct tools and system prompt.
"""
import pytest

from app.agent.tools import get_tools_for_mode, MODE_TOOLS
from app.agent.prompts import build_system_prompt, REVIEW_MODE_PROMPT, PREP_MODE_PROMPT, ANALYTICS_MODE_PROMPT


class TestGetToolsForMode:
    """get_tools_for_mode should resolve sub-modes to base mode tools."""

    def test_base_mode_review(self):
        tools = get_tools_for_mode("review")
        names = {t["name"] for t in tools}
        assert "extract_corrections" in names
        assert "generate_drill" in names
        assert "transcribe_audio" in names

    def test_sub_mode_review_input(self):
        tools = get_tools_for_mode("review:input")
        names = {t["name"] for t in tools}
        assert "extract_corrections" in names
        assert "generate_drill" in names
        assert "transcribe_audio" in names

    def test_sub_mode_review_writing(self):
        tools = get_tools_for_mode("review:writing")
        names = {t["name"] for t in tools}
        assert "extract_corrections" in names
        assert "generate_drill" in names

    def test_base_mode_prep(self):
        tools = get_tools_for_mode("prep")
        names = {t["name"] for t in tools}
        assert "generate_smalltalk_scenario" in names
        assert "polish_english" in names
        assert "analyze_script" in names

    def test_sub_mode_prep_smalltalk(self):
        tools = get_tools_for_mode("prep:smalltalk")
        names = {t["name"] for t in tools}
        assert "generate_smalltalk_scenario" in names
        assert "polish_english" in names

    def test_sub_mode_prep_article(self):
        tools = get_tools_for_mode("prep:article")
        names = {t["name"] for t in tools}
        assert "analyze_script" in names

    def test_sub_mode_prep_freetalk(self):
        tools = get_tools_for_mode("prep:freetalk")
        names = {t["name"] for t in tools}
        assert "explain_expression" in names

    def test_base_mode_analytics(self):
        tools = get_tools_for_mode("analytics")
        names = {t["name"] for t in tools}
        assert "analyze_error_patterns" in names

    def test_unknown_mode_returns_empty(self):
        tools = get_tools_for_mode("nonexistent")
        assert tools == []

    def test_sub_mode_matches_base_mode_exactly(self):
        """Sub-mode tools should be identical to base mode tools."""
        base = get_tools_for_mode("review")
        sub = get_tools_for_mode("review:input")
        assert {t["name"] for t in base} == {t["name"] for t in sub}

    def test_review_does_not_include_prep_tools(self):
        tools = get_tools_for_mode("review:input")
        names = {t["name"] for t in tools}
        assert "generate_smalltalk_scenario" not in names
        assert "polish_english" not in names
        assert "analyze_script" not in names


class TestBuildSystemPrompt:
    """build_system_prompt should resolve sub-modes to base mode prompts."""

    def test_base_mode_review(self):
        prompt = build_system_prompt("review")
        assert "수업 후 복습" in prompt
        assert "도구" in prompt

    def test_sub_mode_review_input(self):
        prompt = build_system_prompt("review:input")
        assert "수업 후 복습" in prompt
        assert "도구" in prompt

    def test_sub_mode_review_writing(self):
        prompt = build_system_prompt("review:writing")
        assert "수업 후 복습" in prompt

    def test_base_mode_prep(self):
        prompt = build_system_prompt("prep")
        assert "수업 전 준비" in prompt

    def test_sub_mode_prep_smalltalk(self):
        prompt = build_system_prompt("prep:smalltalk")
        assert "수업 전 준비" in prompt

    def test_base_mode_analytics(self):
        prompt = build_system_prompt("analytics")
        assert "학습 기록" in prompt

    def test_unknown_mode_falls_back_to_prep(self):
        prompt = build_system_prompt("unknown:sub")
        assert "수업 전 준비" in prompt

    def test_lesson_context_included(self):
        ctx = {"date": "2026-04-27", "day_of_week": "monday", "topic": "AI News"}
        prompt = build_system_prompt("review:input", ctx)
        assert "2026-04-27" in prompt
        assert "AI News" in prompt

    def test_sub_mode_prompt_matches_base(self):
        """Sub-mode prompt should be identical to base mode prompt (same lesson context)."""
        base = build_system_prompt("review")
        sub = build_system_prompt("review:input")
        assert base == sub


class TestReviewPromptToolOnlyOutput:
    """REVIEW_MODE_PROMPT must enforce tool-only output and forbid text analysis."""

    def test_forbids_text_output(self):
        prompt = build_system_prompt("review")
        # Must explicitly forbid text output of analysis
        assert "금지" in prompt

    def test_mandates_tool_only(self):
        prompt = build_system_prompt("review")
        assert "도구" in prompt and "tool" in prompt.lower()

    def test_lists_prohibited_actions(self):
        prompt = build_system_prompt("review")
        # Must list what NOT to do
        assert "하지 말" in prompt or "하면 안" in prompt

    def test_specifies_minimal_text(self):
        prompt = build_system_prompt("review")
        # Must specify that only minimal text is allowed
        assert "분석이 완료되었습니다" in prompt

    def test_specifies_processing_flow(self):
        prompt = build_system_prompt("review")
        assert "extract_corrections" in prompt
        assert "generate_drill" in prompt

    def test_includes_bad_example(self):
        """Prompt should include an example of what NOT to do."""
        prompt = build_system_prompt("review")
        assert "잘못된 응답" in prompt

    def test_forbids_post_tool_explanation(self):
        """Prompt must forbid explaining results after tool calls."""
        prompt = build_system_prompt("review")
        assert "오류 요약" in prompt and "금지" in prompt
