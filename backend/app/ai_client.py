"""
AI 클라이언트 팩토리.
AI_PROVIDER 환경변수에 따라 Anthropic 직접 또는 AWS Bedrock 클라이언트를 생성한다.
"""
import anthropic

from app.config import (
    AI_PROVIDER,
    ANTHROPIC_API_KEY,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_SESSION_TOKEN,
    AWS_REGION,
)

_client = None


def get_client() -> anthropic.Anthropic | anthropic.AnthropicBedrock:
    """싱글톤 AI 클라이언트를 반환한다."""
    global _client
    if _client is not None:
        return _client

    if AI_PROVIDER == "bedrock":
        kwargs = {"aws_region": AWS_REGION}
        # 명시적 키가 있으면 사용, 없으면 AWS 기본 자격증명 체인 (IAM role, ~/.aws/credentials 등)
        if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
            kwargs["aws_access_key"] = AWS_ACCESS_KEY_ID
            kwargs["aws_secret_key"] = AWS_SECRET_ACCESS_KEY
            if AWS_SESSION_TOKEN:
                kwargs["aws_session_token"] = AWS_SESSION_TOKEN
        _client = anthropic.AnthropicBedrock(**kwargs)
    else:
        _client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    return _client
