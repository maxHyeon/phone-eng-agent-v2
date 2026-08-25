"""Test that conversation keys include mode and reset works correctly."""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.anyio
async def test_conv_key_includes_mode(client: AsyncClient):
    """Conversation keys are isolated per mode."""
    from app.routes.chat import _conversations, _conv_key

    _conversations.clear()

    # Simulate storing conversations for different modes
    _conversations[_conv_key(1, "prep")] = [{"role": "user", "content": "prep msg"}]
    _conversations[_conv_key(1, "review")] = [{"role": "user", "content": "review msg"}]

    assert _conv_key(1, "prep") == "1:prep"
    assert _conv_key(1, "review") == "1:review"
    assert _conv_key(1, "prep") != _conv_key(1, "review")

    # Both exist independently
    assert len(_conversations) == 2
    assert _conversations["1:prep"][0]["content"] == "prep msg"
    assert _conversations["1:review"][0]["content"] == "review msg"


@pytest.mark.anyio
async def test_reset_clears_specific_mode(client: AsyncClient):
    """Reset with mode only clears that mode's conversation."""
    from app.routes.chat import _conversations, _conv_key

    _conversations.clear()
    _conversations[_conv_key(1, "prep")] = [{"role": "user", "content": "prep"}]
    _conversations[_conv_key(1, "review")] = [{"role": "user", "content": "review"}]

    resp = await client.post("/api/chat/reset", json={"lesson_id": 1, "mode": "prep"})
    assert resp.status_code == 200

    # prep cleared, review remains
    assert "1:prep" not in _conversations
    assert "1:review" in _conversations


@pytest.mark.anyio
async def test_reset_without_mode_clears_all_for_lesson(client: AsyncClient):
    """Reset without mode clears all conversations for that lesson."""
    from app.routes.chat import _conversations, _conv_key

    _conversations.clear()
    _conversations[_conv_key(1, "prep")] = [{"role": "user", "content": "prep"}]
    _conversations[_conv_key(1, "review")] = [{"role": "user", "content": "review"}]
    _conversations[_conv_key(2, "prep")] = [{"role": "user", "content": "other lesson"}]

    resp = await client.post("/api/chat/reset", json={"lesson_id": 1})
    assert resp.status_code == 200

    # lesson 1 cleared entirely, lesson 2 remains
    assert "1:prep" not in _conversations
    assert "1:review" not in _conversations
    assert "2:prep" in _conversations


@pytest.mark.anyio
async def test_reset_reads_body_not_query_params(client: AsyncClient):
    """Reset endpoint reads lesson_id and mode from JSON body, not query params."""
    from app.routes.chat import _conversations, _conv_key

    _conversations.clear()
    _conversations[_conv_key(6, "prep")] = [{"role": "user", "content": "hello"}]

    # Send as body (like frontend does)
    resp = await client.post(
        "/api/chat/reset",
        json={"lesson_id": 6, "mode": "prep"},
    )
    assert resp.status_code == 200
    assert "6:prep" not in _conversations
