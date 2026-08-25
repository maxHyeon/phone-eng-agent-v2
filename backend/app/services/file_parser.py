import base64

from app.config import get_claude_model
from app.ai_client import get_client


def extract_text_from_image(image_bytes: bytes, content_type: str) -> str:
    """Extract text from an image using Claude Vision."""
    client = get_client()
    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    media_type = content_type if content_type.startswith("image/") else "image/png"

    response = client.messages.create(
        model=get_claude_model(),
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": media_type, "data": b64},
                    },
                    {
                        "type": "text",
                        "text": (
                            "이 이미지에서 모든 텍스트를 추출해주세요. "
                            "전화영어 수업 피드백 이미지입니다. "
                            "발음 교정, 문법 교정, 코멘트 등을 구분하여 정리해주세요. "
                            "텍스트만 반환하세요."
                        ),
                    },
                ],
            }
        ],
    )
    return response.content[0].text
