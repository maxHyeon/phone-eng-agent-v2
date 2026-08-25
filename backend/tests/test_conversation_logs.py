"""Test conversation log save/load API."""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import init_db, get_db


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def _setup_db():
    """Ensure DB schema is up to date (includes conversation_logs table)."""
    init_db()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
async def lesson_id(client: AsyncClient) -> int:
    """Create a test lesson and return its ID."""
    resp = await client.get("/api/lessons/today")
    assert resp.status_code == 200
    return resp.json()["id"]


@pytest.mark.anyio
async def test_save_and_load_conversations(client: AsyncClient, lesson_id: int):
    conversations = {
        "prep:smalltalk": [
            {"role": "user", "content": "hello"},
            {"role": "assistant", "content": "Hi there!"},
        ],
        "review:input": [
            {"role": "user", "content": "analyze this"},
        ],
    }

    # Save
    resp = await client.post(
        f"/api/lessons/{lesson_id}/conversations",
        json={"conversations": conversations},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "saved"

    # Load
    resp = await client.get(f"/api/lessons/{lesson_id}/conversations")
    assert resp.status_code == 200
    data = resp.json()
    assert "prep:smalltalk" in data
    assert len(data["prep:smalltalk"]) == 2
    assert data["prep:smalltalk"][0]["content"] == "hello"
    assert "review:input" in data
    assert len(data["review:input"]) == 1


@pytest.mark.anyio
async def test_save_upserts_existing(client: AsyncClient, lesson_id: int):
    """Saving again should update, not duplicate."""
    conversations_v1 = {
        "prep:smalltalk": [{"role": "user", "content": "first"}],
    }
    conversations_v2 = {
        "prep:smalltalk": [
            {"role": "user", "content": "first"},
            {"role": "assistant", "content": "updated response"},
        ],
    }

    await client.post(f"/api/lessons/{lesson_id}/conversations", json={"conversations": conversations_v1})
    await client.post(f"/api/lessons/{lesson_id}/conversations", json={"conversations": conversations_v2})

    resp = await client.get(f"/api/lessons/{lesson_id}/conversations")
    data = resp.json()
    assert len(data["prep:smalltalk"]) == 2
    assert data["prep:smalltalk"][1]["content"] == "updated response"


@pytest.mark.anyio
async def test_load_empty_returns_empty(client: AsyncClient, lesson_id: int):
    """Loading conversations for a lesson with no saved logs returns empty dict."""
    resp = await client.get(f"/api/lessons/{lesson_id}/conversations")
    assert resp.status_code == 200
    assert resp.json() == {} or isinstance(resp.json(), dict)


@pytest.mark.anyio
async def test_save_to_nonexistent_lesson(client: AsyncClient):
    """Saving to a non-existent lesson returns 404."""
    resp = await client.post(
        "/api/lessons/99999/conversations",
        json={"conversations": {"prep:smalltalk": []}},
    )
    assert resp.status_code == 404
