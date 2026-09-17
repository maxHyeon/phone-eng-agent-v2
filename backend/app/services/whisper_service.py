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
    """Transcribe an audio file with timestamped segments for speaker identification.

    Anti-hallucination settings applied:
    - condition_on_previous_text=False : 이전 텍스트를 컨텍스트로 주지 않아 반복 루프 차단
    - compression_ratio_threshold=2.4  : 반복 텍스트 압축비 초과 시 해당 세그먼트 재시도
    - no_speech_threshold=0.6          : 무음 구간을 텍스트로 채우지 않도록 필터링
    - temperature=0.0                  : greedy decoding으로 안정적인 출력
    """
    import mlx_whisper

    result = mlx_whisper.transcribe(
        file_path,
        path_or_hf_repo=_get_model_path(),
        condition_on_previous_text=False,  # 반복 루프 핵심 원인 차단
        compression_ratio_threshold=2.4,   # 반복 텍스트 감지 후 재시도
        no_speech_threshold=0.6,           # 무음/저음 구간 스킵
        temperature=0.0,                   # greedy decoding
    )

    segments = result.get("segments", [])
    if not segments:
        return result["text"]

    lines = []
    for seg in segments:
        text = seg["text"].strip()
        if not text:
            continue
        # no_speech_prob이 높은 세그먼트(무음 판정) 추가 필터링
        if seg.get("no_speech_prob", 0) > 0.8:
            continue
        start = _format_timestamp(seg["start"])
        end = _format_timestamp(seg["end"])
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
