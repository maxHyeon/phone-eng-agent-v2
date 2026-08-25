import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = BASE_DIR / "uploads"

DATA_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)

SQLITE_DB_PATH = DATA_DIR / "phone_eng.db"
WHISPER_MODEL = "base"

# --- AI Provider Config ---
# Supported: "anthropic", "bedrock"
AI_PROVIDER = os.getenv("AI_PROVIDER", "anthropic")

# Anthropic direct
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# AWS Bedrock
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_SESSION_TOKEN = os.getenv("AWS_SESSION_TOKEN", "")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# Model ID per provider
CLAUDE_MODEL_ANTHROPIC = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6-20250514")
CLAUDE_MODEL_BEDROCK = os.getenv("CLAUDE_MODEL_BEDROCK", "us.anthropic.claude-sonnet-4-6-20250514-v1:0")


def get_claude_model() -> str:
    if AI_PROVIDER == "bedrock":
        return CLAUDE_MODEL_BEDROCK
    return CLAUDE_MODEL_ANTHROPIC
