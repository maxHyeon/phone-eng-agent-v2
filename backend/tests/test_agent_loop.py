"""Tests for agent loop utilities: history validation and lesson_id override."""
import json
import pytest

from app.agent.loop import _validate_history


class TestValidateHistory:
    """_validate_history truncates corrupted conversation history."""

    def test_empty_history(self):
        assert _validate_history([]) == []

    def test_valid_simple_history(self):
        history = [
            {"role": "user", "content": "hello"},
            {"role": "assistant", "content": [{"type": "text", "text": "hi"}]},
        ]
        assert _validate_history(history) == history

    def test_valid_history_with_tool_use(self):
        history = [
            {"role": "user", "content": "analyze"},
            {"role": "assistant", "content": [
                {"type": "text", "text": "분석 중..."},
                {"type": "tool_use", "id": "tool_1", "name": "extract_corrections", "input": {}},
            ]},
            {"role": "user", "content": [
                {"type": "tool_result", "tool_use_id": "tool_1", "content": '{"count": 1}'},
            ]},
            {"role": "assistant", "content": [{"type": "text", "text": "완료"}]},
        ]
        assert _validate_history(history) == history

    def test_truncates_dangling_tool_use(self):
        """If assistant has tool_use but no following tool_result, truncate."""
        history = [
            {"role": "user", "content": "analyze"},
            {"role": "assistant", "content": [
                {"type": "tool_use", "id": "tool_1", "name": "extract_corrections", "input": {}},
            ]},
            # Missing tool_result — next message is a regular user message
            {"role": "user", "content": "hello again"},
        ]
        # Should truncate at the assistant message with dangling tool_use
        result = _validate_history(history)
        assert len(result) == 1
        assert result[0]["role"] == "user"
        assert result[0]["content"] == "analyze"

    def test_truncates_when_no_next_message(self):
        """If assistant has tool_use but history ends there, truncate."""
        history = [
            {"role": "user", "content": "analyze"},
            {"role": "assistant", "content": [
                {"type": "tool_use", "id": "tool_1", "name": "extract_corrections", "input": {}},
            ]},
        ]
        result = _validate_history(history)
        assert len(result) == 1

    def test_truncates_partial_tool_results(self):
        """If assistant has 2 tool_use blocks but only 1 result, truncate."""
        history = [
            {"role": "user", "content": "analyze"},
            {"role": "assistant", "content": [
                {"type": "tool_use", "id": "tool_1", "name": "extract_corrections", "input": {}},
                {"type": "tool_use", "id": "tool_2", "name": "generate_drill", "input": {}},
            ]},
            {"role": "user", "content": [
                {"type": "tool_result", "tool_use_id": "tool_1", "content": '{"count": 1}'},
                # Missing tool_result for tool_2
            ]},
        ]
        result = _validate_history(history)
        assert len(result) == 1

    def test_valid_multiple_tool_uses(self):
        """Multiple tool_use blocks with all matching results pass."""
        history = [
            {"role": "user", "content": "analyze"},
            {"role": "assistant", "content": [
                {"type": "tool_use", "id": "tool_1", "name": "extract_corrections", "input": {}},
                {"type": "tool_use", "id": "tool_2", "name": "generate_drill", "input": {}},
            ]},
            {"role": "user", "content": [
                {"type": "tool_result", "tool_use_id": "tool_1", "content": '{"count": 1}'},
                {"type": "tool_result", "tool_use_id": "tool_2", "content": '{"count": 2}'},
            ]},
            {"role": "assistant", "content": [{"type": "text", "text": "done"}]},
        ]
        assert _validate_history(history) == history

    def test_preserves_history_before_corruption(self):
        """Valid earlier turns are kept even when later ones are corrupted."""
        history = [
            {"role": "user", "content": "hello"},
            {"role": "assistant", "content": [{"type": "text", "text": "hi"}]},
            {"role": "user", "content": "analyze"},
            {"role": "assistant", "content": [
                {"type": "tool_use", "id": "tool_1", "name": "extract_corrections", "input": {}},
            ]},
            # No tool_result follows
        ]
        result = _validate_history(history)
        assert len(result) == 3
        assert result[0]["content"] == "hello"
        assert result[1]["content"] == [{"type": "text", "text": "hi"}]
        assert result[2]["content"] == "analyze"

    def test_string_content_assistant_passes(self):
        """Assistant messages with plain string content (no tool_use) pass."""
        history = [
            {"role": "user", "content": "hello"},
            {"role": "assistant", "content": "hi there"},
        ]
        assert _validate_history(history) == history
