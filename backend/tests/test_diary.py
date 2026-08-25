"""Test diary API endpoints using an isolated temporary DB."""
import tempfile
from pathlib import Path

import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import init_db


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def _use_temp_db(tmp_path):
    """Redirect all DB operations to a temporary file so production data is never touched."""
    test_db = tmp_path / "test.db"
    with patch("app.database.SQLITE_DB_PATH", test_db):
        init_db()
        yield


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
async def lesson_id(client: AsyncClient) -> int:
    resp = await client.get("/api/lessons/today")
    assert resp.status_code == 200
    return resp.json()["id"]


@pytest.mark.anyio
async def test_create_diary_entry(client: AsyncClient):
    """POST /api/diary creates an entry with AI correction."""
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="The weather was nice today so I took a walk.")]

    with patch("app.routes.diary.get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response
        mock_get_client.return_value = mock_client

        resp = await client.post("/api/diary", json={
            "date": "2026-05-27",
            "user_input": "오늘 날씨가 좋아서 산책했다",
            "memo": "기분 좋았음",
        })

    assert resp.status_code == 201
    data = resp.json()
    assert data["date"] == "2026-05-27"
    assert data["user_input"] == "오늘 날씨가 좋아서 산책했다"
    assert data["ai_output"] == "The weather was nice today so I took a walk."
    assert data["memo"] == "기분 좋았음"
    assert data["source"] == "manual"


@pytest.mark.anyio
async def test_create_diary_without_ai(client: AsyncClient):
    """If AI correction fails, entry is saved with ai_output=null."""
    with patch("app.routes.diary.get_client") as mock_get_client:
        mock_get_client.side_effect = Exception("API error")

        resp = await client.post("/api/diary", json={
            "date": "2026-05-27",
            "user_input": "Today was good",
        })

    assert resp.status_code == 201
    data = resp.json()
    assert data["user_input"] == "Today was good"
    assert data["ai_output"] is None


@pytest.mark.anyio
async def test_get_diary_dates(client: AsyncClient):
    """GET /api/diary/dates returns dates with entries."""
    with patch("app.routes.diary.get_client") as mock_get_client:
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Corrected.")]
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response
        mock_get_client.return_value = mock_client

        await client.post("/api/diary", json={"date": "2026-05-10", "user_input": "test1"})
        await client.post("/api/diary", json={"date": "2026-05-15", "user_input": "test2"})

    resp = await client.get("/api/diary/dates?year=2026&month=5")
    assert resp.status_code == 200
    dates = resp.json()
    assert "2026-05-10" in dates
    assert "2026-05-15" in dates


@pytest.mark.anyio
async def test_get_diary_dates_includes_lesson_data(client: AsyncClient, lesson_id: int):
    """Diary dates should include dates with lesson data (daily_stories)."""
    from app.database import get_db

    with get_db() as db:
        lesson = db.execute("SELECT date FROM lessons WHERE id = ?", (lesson_id,)).fetchone()
        lesson_date = lesson["date"]
        db.execute(
            "INSERT INTO daily_stories (lesson_id, korean_input, english_output) VALUES (?, ?, ?)",
            (lesson_id, "어제 뭐했어", "What did you do yesterday?"),
        )

    parts = lesson_date.split("-")
    year, month = int(parts[0]), int(parts[1])

    resp = await client.get(f"/api/diary/dates?year={year}&month={month}")
    assert resp.status_code == 200
    assert lesson_date in resp.json()


@pytest.mark.anyio
async def test_get_diary_by_date(client: AsyncClient):
    """GET /api/diary/{date} returns entries for that date."""
    with patch("app.routes.diary.get_client") as mock_get_client:
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Hello world.")]
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response
        mock_get_client.return_value = mock_client

        await client.post("/api/diary", json={"date": "2026-05-20", "user_input": "안녕"})

    resp = await client.get("/api/diary/2026-05-20")
    assert resp.status_code == 200
    entries = resp.json()
    assert len(entries) == 1
    assert entries[0]["user_input"] == "안녕"
    assert entries[0]["source"] == "manual"


@pytest.mark.anyio
async def test_get_diary_by_date_empty(client: AsyncClient):
    """GET /api/diary/{date} returns empty list for date with no entries."""
    resp = await client.get("/api/diary/2020-01-01")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.anyio
async def test_update_diary_memo(client: AsyncClient):
    """PUT /api/diary/{id}/memo updates the memo."""
    with patch("app.routes.diary.get_client") as mock_get_client:
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Corrected.")]
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response
        mock_get_client.return_value = mock_client

        create_resp = await client.post("/api/diary", json={"date": "2026-05-20", "user_input": "test"})

    entry_id = create_resp.json()["id"]

    resp = await client.put(f"/api/diary/{entry_id}/memo", json={"memo": "새 메모"})
    assert resp.status_code == 200
    assert resp.json()["memo"] == "새 메모"


@pytest.mark.anyio
async def test_update_memo_nonexistent(client: AsyncClient):
    """PUT /api/diary/{id}/memo returns 404 for non-existent entry."""
    resp = await client.put("/api/diary/99999/memo", json={"memo": "test"})
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_delete_diary_entry(client: AsyncClient):
    """DELETE /api/diary/{id} removes manual entries."""
    with patch("app.routes.diary.get_client") as mock_get_client:
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Corrected.")]
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response
        mock_get_client.return_value = mock_client

        create_resp = await client.post("/api/diary", json={"date": "2026-05-20", "user_input": "삭제할 일기"})

    entry_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/diary/{entry_id}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "deleted"

    # Confirm deletion
    resp = await client.get("/api/diary/2026-05-20")
    entries = resp.json()
    assert len(entries) == 0


@pytest.mark.anyio
async def test_delete_nonexistent_diary(client: AsyncClient):
    """DELETE /api/diary/{id} returns 404 for non-existent entry."""
    resp = await client.delete("/api/diary/99999")
    assert resp.status_code == 404
