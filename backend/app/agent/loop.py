import json
from typing import Generator

import anthropic

from app.config import get_claude_model
from app.ai_client import get_client
from app.agent.prompts import build_system_prompt
from app.agent.tools import get_tools_for_mode, execute_tool
from app.services import db_service


def sse_event(event_type: str, data) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def _serialize_content(content) -> list[dict]:
    """Convert SDK content blocks to plain dicts for Bedrock compatibility."""
    result = []
    for block in content:
        if block.type == "text":
            result.append({"type": "text", "text": block.text})
        elif block.type == "tool_use":
            result.append({
                "type": "tool_use",
                "id": block.id,
                "name": block.name,
                "input": block.input,
            })
    return result


def _validate_history(history: list[dict]) -> list[dict]:
    """Ensure conversation history has valid tool_use/tool_result pairing.

    If an assistant message has tool_use blocks, the next message must be
    a user message with corresponding tool_result blocks. If not, truncate
    the history at the point of corruption.
    """
    validated = []
    for i, msg in enumerate(history):
        if msg.get("role") == "assistant":
            # Check if this message has tool_use blocks
            content = msg.get("content", [])
            if isinstance(content, list):
                tool_use_ids = [
                    b["id"] for b in content
                    if isinstance(b, dict) and b.get("type") == "tool_use"
                ]
                if tool_use_ids:
                    # Next message must have tool_results for these IDs
                    next_msg = history[i + 1] if i + 1 < len(history) else None
                    if not next_msg or next_msg.get("role") != "user":
                        # Corrupted — truncate here
                        break
                    next_content = next_msg.get("content", [])
                    if not isinstance(next_content, list):
                        break
                    result_ids = {
                        b["tool_use_id"] for b in next_content
                        if isinstance(b, dict) and b.get("type") == "tool_result"
                    }
                    if not all(tid in result_ids for tid in tool_use_ids):
                        break
        validated.append(msg)
    return validated


def run_agent_stream(
    message: str,
    mode: str = "prep",
    lesson_id: int | None = None,
    conversation_history: list[dict] | None = None,
) -> Generator[str, None, list[dict]]:
    """Generator that yields SSE events and returns final conversation history."""

    # Build system prompt with lesson context
    lesson_context = None
    if lesson_id:
        lesson_context = db_service.get_lesson(lesson_id)

    system_prompt = build_system_prompt(mode, lesson_context)
    tools = get_tools_for_mode(mode)

    # Build messages — validate history to prevent API errors
    messages = _validate_history(conversation_history or [])
    messages.append({"role": "user", "content": message})

    while True:
        # Stream response from Claude
        collected_text = ""
        tool_use_blocks = []

        with get_client().messages.stream(
            model=get_claude_model(),
            max_tokens=4096,
            system=system_prompt,
            messages=messages,
            tools=tools if tools else anthropic.NOT_GIVEN,
        ) as stream:
            for event in stream:
                if event.type == "content_block_start":
                    if event.content_block.type == "tool_use":
                        yield sse_event("tool_start", {"name": event.content_block.name})

                elif event.type == "content_block_delta":
                    if event.delta.type == "text_delta":
                        collected_text += event.delta.text
                        yield sse_event("text_delta", event.delta.text)

            response = stream.get_final_message()

        # Check stop reason
        if response.stop_reason == "end_turn":
            # Done — append assistant message and return
            messages.append({"role": "assistant", "content": _serialize_content(response.content)})
            yield sse_event("done", {"status": "complete"})
            return messages

        if response.stop_reason == "tool_use":
            # Append assistant message with tool_use blocks
            messages.append({"role": "assistant", "content": _serialize_content(response.content)})

            # Execute each tool (always produce a result to keep history valid)
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    # Override lesson_id to ensure agent uses the correct one
                    tool_input = block.input
                    if lesson_id and "lesson_id" in tool_input:
                        tool_input = {**tool_input, "lesson_id": lesson_id}
                    try:
                        result = execute_tool(block.name, tool_input)
                    except Exception as e:
                        result = json.dumps({"error": str(e)})
                    yield sse_event("tool_result", {
                        "name": block.name,
                        "result": json.loads(result),
                    })
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })

            # Append tool results as user message and continue loop
            messages.append({"role": "user", "content": tool_results})
        else:
            # Unexpected stop reason — finish
            messages.append({"role": "assistant", "content": _serialize_content(response.content)})
            yield sse_event("done", {"status": "complete"})
            return messages
