from fastapi import APIRouter, HTTPException

from app.services.backup_service import create_backup, list_backups, restore_backup

router = APIRouter()


@router.get("/backup")
async def get_backups():
    return list_backups()


@router.post("/backup")
async def trigger_backup():
    path = create_backup()
    return {"status": "created", "filename": path.name}


@router.post("/backup/restore")
async def trigger_restore(filename: str):
    if not restore_backup(filename):
        raise HTTPException(status_code=404, detail="Backup file not found")
    return {"status": "restored", "filename": filename}
