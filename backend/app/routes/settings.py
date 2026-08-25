from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import BASE_DIR

router = APIRouter()

ENV_PATH = BASE_DIR / ".env"

# Provider별 env 키 정의
PROVIDER_FIELDS = {
    "anthropic": [
        {"key": "ANTHROPIC_API_KEY", "label": "Anthropic API Key", "secret": True},
        {"key": "CLAUDE_MODEL", "label": "Model ID", "secret": False, "default": "claude-sonnet-4-6-20250514"},
    ],
    "bedrock": [
        {"key": "AWS_REGION", "label": "AWS Region", "secret": False, "default": "us-east-1"},
        {"key": "AWS_ACCESS_KEY_ID", "label": "AWS Access Key ID", "secret": True},
        {"key": "AWS_SECRET_ACCESS_KEY", "label": "AWS Secret Access Key", "secret": True},
        {"key": "AWS_SESSION_TOKEN", "label": "AWS Session Token (optional)", "secret": True},
        {"key": "CLAUDE_MODEL_BEDROCK", "label": "Bedrock Model ID", "secret": False, "default": "us.anthropic.claude-sonnet-4-6-20250514-v1:0"},
    ],
}


def _parse_env() -> dict[str, str]:
    """Parse .env file into a dict."""
    env = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip()
    return env


def _write_env(env: dict[str, str]) -> None:
    """Write dict back to .env file."""
    lines = []
    for key, value in env.items():
        lines.append(f"{key}={value}")
    ENV_PATH.write_text("\n".join(lines) + "\n")


def _mask_value(value: str) -> str:
    """Mask secret values for display."""
    if len(value) <= 8:
        return "*" * len(value)
    return value[:4] + "*" * (len(value) - 8) + value[-4:]


@router.get("/settings/providers")
async def get_providers():
    """프로바이더 목록과 각 필드 정의를 반환한다."""
    return {"providers": PROVIDER_FIELDS}


@router.get("/settings")
async def get_settings():
    """현재 .env 설정값을 반환한다. secret 값은 마스킹 처리."""
    env = _parse_env()
    current_provider = env.get("AI_PROVIDER", "anthropic")

    # 모든 필드의 현재 값 반환 (secret은 마스킹)
    values: dict[str, str] = {}
    has_value: dict[str, bool] = {}
    for fields in PROVIDER_FIELDS.values():
        for field in fields:
            raw = env.get(field["key"], "")
            has_value[field["key"]] = bool(raw)
            if field.get("secret") and raw:
                values[field["key"]] = _mask_value(raw)
            else:
                values[field["key"]] = raw

    return {
        "provider": current_provider,
        "values": values,
        "has_value": has_value,
    }


class SaveSettingsRequest(BaseModel):
    provider: str
    values: dict[str, str]


@router.post("/settings")
async def save_settings(req: SaveSettingsRequest):
    """설정을 .env 파일에 저장한다."""
    env = _parse_env()

    env["AI_PROVIDER"] = req.provider

    # 마스킹된 값(변경 안 한 필드)은 기존 값 유지
    for key, value in req.values.items():
        if "*" in value:
            # 마스킹된 값이면 기존 값 유지
            continue
        env[key] = value

    _write_env(env)

    return {"status": "saved", "provider": req.provider}
