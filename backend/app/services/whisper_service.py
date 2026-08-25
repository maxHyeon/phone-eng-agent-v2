import tempfile
from pathlib import Path

from app.config import WHISPER_MODEL

_model_path = None


def _get_model_path() -> str:
    """Return the Whisper model path string for mlx-whisper."""
    global _model_path
    if _model_path is None:
        _model_path = f"mlx-community/whisper-{WHISPER_MODEL}-mlx"
    return _model_path


def _format_timestamp(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    return f"{m:02d}:{s:02d}"


def transcribe_file(file_path: str) -> str:
    """Transcribe an audio file with timestamped segments for speaker identification."""
    import mlx_whisper

    result = mlx_whisper.transcribe(file_path, path_or_hf_repo=_get_model_path())

    segments = result.get("segments", [])
    if not segments:
        return result["text"]

    lines = []
    for seg in segments:
        start = _format_timestamp(seg["start"])
        end = _format_timestamp(seg["end"])
        text = seg["text"].strip()
        if text:
            lines.append(f"[{start}-{end}] {text}")

    return "\n".join(lines)


def transcribe_bytes(audio_bytes: bytes, suffix: str = ".webm") -> str:
    """Transcribe raw audio bytes (e.g. from browser MediaRecorder)."""
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name
    try:
        return transcribe_file(tmp_path)
    finally:
        Path(tmp_path).unlink(missing_ok=True)
