from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.services.backup_service import start_scheduler, stop_scheduler
from app.routes import (
    chat,
    lessons,
    upload,
    expressions,
    corrections,
    drills,
    recordings,
    analytics,
    quiz,
    settings,
    report,
    vocab,
    diary,
    backup,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="Phone English Agent v2", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api")
app.include_router(lessons.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(expressions.router, prefix="/api")
app.include_router(corrections.router, prefix="/api")
app.include_router(drills.router, prefix="/api")
app.include_router(recordings.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(quiz.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(report.router, prefix="/api")
app.include_router(vocab.router, prefix="/api")
app.include_router(diary.router, prefix="/api")
app.include_router(backup.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
