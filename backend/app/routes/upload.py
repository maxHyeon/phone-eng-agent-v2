import shutil
from pathlib import Path

from fastapi import APIRouter, UploadFile, HTTPException

from app.config import UPLOADS_DIR
from app.services import db_service
from app.services.whisper_service import transcribe_file, transcribe_bytes
from app.services.file_parser import extract_text_from_image

router = APIRouter()


@router.post("/upload/recording")
async def upload_recording(file: UploadFile, lesson_id: int):
    """Upload a lesson recording file and start transcription."""
    if not file.filename:
        raise HTTPException(400, "No filename")

    # Save file
    dest = UPLOADS_DIR / f"{lesson_id}_{file.filename}"
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Save record
    recording = db_service.save_recording(lesson_id, str(dest))

    # Transcribe (synchronous for now)
    try:
        transcript = transcribe_file(str(dest))
        recording = db_service.update_recording(recording["id"], transcript)
    except Exception as e:
        db_service.update_recording(recording["id"], f"Error: {str(e)}", status="error")

    return recording


@router.post("/upload/screenshot")
async def upload_screenshot(file: UploadFile, lesson_id: int):
    """Upload a feedback screenshot and extract text using Claude Vision."""
    if not file.filename:
        raise HTTPException(400, "No filename")

    content = await file.read()
    content_type = file.content_type or "image/png"

    extracted_text = extract_text_from_image(content, content_type)
    return {"filename": file.filename, "extracted_text": extracted_text, "lesson_id": lesson_id}


@router.post("/whisper/transcribe")
async def whisper_transcribe(file: UploadFile):
    """Transcribe short voice input from browser microphone."""
    content = await file.read()
    suffix = Path(file.filename or "audio.webm").suffix or ".webm"
    transcript = transcribe_bytes(content, suffix)
    return {"text": transcript}
