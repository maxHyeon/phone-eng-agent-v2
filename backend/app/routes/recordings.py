from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.models import RecordingOut
from app.services import db_service

router = APIRouter()


@router.get("/lessons/{lesson_id}/recordings", response_model=list[RecordingOut])
async def get_recordings(lesson_id: int):
    return db_service.get_recordings(lesson_id)


@router.get("/recordings/{recording_id}/file")
async def get_recording_file(recording_id: int):
    """Serve a recording audio file for playback or download."""
    recordings = []
    from app.database import get_db
    with get_db() as db:
        row = db.execute("SELECT * FROM recordings WHERE id = ?", (recording_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Recording not found")
        recording = dict(row)

    file_path = Path(recording["file_path"])
    if not file_path.exists():
        raise HTTPException(404, "File not found on disk")

    suffix = file_path.suffix.lower()
    media_types = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
        ".webm": "audio/webm",
    }
    media_type = media_types.get(suffix, "application/octet-stream")

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=file_path.name,
    )
