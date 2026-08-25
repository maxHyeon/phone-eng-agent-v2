from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models import ChatRequest, ChatResetRequest
from app.agent.loop import run_agent_stream

router = APIRouter()

# In-memory conversation history per lesson
_conversations: dict[str, list[dict]] = {}


def _conv_key(lesson_id: int | None, mode: str = "prep") -> str:
    base = str(lesson_id) if lesson_id else "default"
    return f"{base}:{mode}"


@router.post("/chat")
async def chat(req: ChatRequest):
    key = _conv_key(req.lesson_id, req.mode)
    history = _conversations.get(key, [])

    def generate():
        gen = run_agent_stream(
            message=req.message,
            mode=req.mode,
            lesson_id=req.lesson_id,
            conversation_history=history,
        )
        final_messages = None
        try:
            while True:
                event = next(gen)
                yield event
        except StopIteration as e:
            final_messages = e.value
        if final_messages is not None:
            _conversations[key] = final_messages

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/chat/reset")
async def reset_chat(req: ChatResetRequest):
    if req.mode:
        key = _conv_key(req.lesson_id, req.mode)
        _conversations.pop(key, None)
    else:
        prefix = f"{req.lesson_id}:" if req.lesson_id else "default:"
        for k in [k for k in _conversations if k.startswith(prefix)]:
            _conversations.pop(k, None)
    return {"status": "cleared"}
