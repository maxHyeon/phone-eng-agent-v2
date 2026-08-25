"""SQLite automatic backup service.

Uses Python's sqlite3.Connection.backup() for safe online backups.
- Background scheduler: checks every hour, backs up once per day
- Keeps the most recent N backups (default: 7)
- Manual backup via API
"""
import asyncio
import sqlite3
import logging
from datetime import datetime
from pathlib import Path

from app.config import SQLITE_DB_PATH, BASE_DIR

BACKUP_DIR = BASE_DIR / "backups"
MAX_BACKUPS = 7
CHECK_INTERVAL_SECONDS = 3600  # Check every hour

logger = logging.getLogger(__name__)

_scheduler_task: asyncio.Task | None = None


def _ensure_backup_dir():
    BACKUP_DIR.mkdir(exist_ok=True)


def create_backup() -> Path:
    """Create a backup of the current database. Returns the backup file path."""
    _ensure_backup_dir()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"phone_eng_{timestamp}.db"

    src = sqlite3.connect(str(SQLITE_DB_PATH))
    dst = sqlite3.connect(str(backup_path))
    try:
        src.backup(dst)
        logger.info(f"Backup created: {backup_path.name}")
    finally:
        dst.close()
        src.close()

    _rotate_backups()
    return backup_path


def _rotate_backups():
    """Remove oldest backups, keeping only MAX_BACKUPS most recent."""
    _ensure_backup_dir()
    backups = sorted(BACKUP_DIR.glob("phone_eng_*.db"), key=lambda p: p.stat().st_mtime)
    # Exclude pre_restore backups from rotation count
    regular_backups = [b for b in backups if "pre_restore" not in b.name]
    while len(regular_backups) > MAX_BACKUPS:
        oldest = regular_backups.pop(0)
        oldest.unlink()
        logger.info(f"Rotated old backup: {oldest.name}")


def _backup_if_needed():
    """Create a backup if none exists for today."""
    _ensure_backup_dir()

    today = datetime.now().strftime("%Y%m%d")
    today_backups = list(BACKUP_DIR.glob(f"phone_eng_{today}_*.db"))

    if today_backups:
        return None

    if not SQLITE_DB_PATH.exists():
        return None

    return create_backup()


async def _scheduler_loop():
    """Background loop that checks once per hour and backs up once per day."""
    while True:
        try:
            _backup_if_needed()
        except Exception as e:
            logger.error(f"Auto-backup failed: {e}")
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)


def start_scheduler():
    """Start the background backup scheduler."""
    global _scheduler_task
    # Run immediate check
    try:
        _backup_if_needed()
    except Exception as e:
        logger.error(f"Initial backup check failed: {e}")
    # Start periodic loop
    _scheduler_task = asyncio.create_task(_scheduler_loop())
    logger.info("Backup scheduler started (interval: 1 hour)")


def stop_scheduler():
    """Stop the background backup scheduler."""
    global _scheduler_task
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
        _scheduler_task = None
        logger.info("Backup scheduler stopped")


def list_backups() -> list[dict]:
    """List all backup files with metadata."""
    _ensure_backup_dir()
    backups = sorted(BACKUP_DIR.glob("phone_eng_*.db"), key=lambda p: p.stat().st_mtime, reverse=True)
    return [
        {
            "filename": p.name,
            "size_bytes": p.stat().st_size,
            "created_at": datetime.fromtimestamp(p.stat().st_mtime).isoformat(),
        }
        for p in backups
    ]


def restore_backup(filename: str) -> bool:
    """Restore a backup file over the current database."""
    backup_path = BACKUP_DIR / filename
    if not backup_path.exists():
        return False

    # First, backup current state before restoring
    _ensure_backup_dir()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    pre_restore = BACKUP_DIR / f"phone_eng_pre_restore_{timestamp}.db"

    src = sqlite3.connect(str(SQLITE_DB_PATH))
    dst = sqlite3.connect(str(pre_restore))
    try:
        src.backup(dst)
    finally:
        dst.close()
        src.close()

    # Restore from backup
    src = sqlite3.connect(str(backup_path))
    dst = sqlite3.connect(str(SQLITE_DB_PATH))
    try:
        src.backup(dst)
        logger.info(f"Restored from: {filename}")
    finally:
        dst.close()
        src.close()

    return True
