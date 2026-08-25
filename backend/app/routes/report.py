from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.services import db_service

router = APIRouter()

REPORTS_DIR = Path(__file__).resolve().parent.parent.parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)


def _generate_report_md(lesson: dict, corrections: list[dict], drills: list[dict]) -> str:
    """Generate a markdown review report."""
    lines = [f"# Review Report — {lesson['date']}"]
    if lesson.get("topic"):
        lines.append(f"**Topic:** {lesson['topic']}")
    lines.append("")

    # Error summary
    error_counts: dict[str, int] = {}
    for c in corrections:
        t = c.get("error_type") or "other"
        error_counts[t] = error_counts.get(t, 0) + 1

    lines.append("## Error Summary")
    lines.append(f"Total corrections: **{len(corrections)}**\n")
    if error_counts:
        lines.append("| Error Type | Count |")
        lines.append("|------------|-------|")
        for t, cnt in sorted(error_counts.items(), key=lambda x: -x[1]):
            lines.append(f"| {t} | {cnt} |")
        lines.append("")

    # Corrections detail
    lines.append("## Corrections\n")
    for i, c in enumerate(corrections, 1):
        badge = f"[{c.get('error_type', 'other')}]" if c.get("error_type") else ""
        lines.append(f"### {i}. {badge}")
        lines.append(f"- **Original:** ~~{c['original']}~~")
        lines.append(f"- **Corrected:** {c['corrected']}")
        if c.get("explanation"):
            lines.append(f"- **Explanation:** {c['explanation']}")
        lines.append("")

    # Drills
    if drills:
        lines.append("## Drills\n")
        for i, d in enumerate(drills, 1):
            dtype = d.get("drill_type", "").replace("_", " ")
            lines.append(f"### Drill {i} ({dtype})")
            lines.append(f"**Q:** {d['question']}")
            if d.get("correct_answer"):
                lines.append(f"**A:** {d['correct_answer']}")
            lines.append("")

    return "\n".join(lines)


@router.post("/lessons/{lesson_id}/report")
async def generate_report(lesson_id: int):
    lesson = db_service.get_lesson(lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")

    corrections = db_service.get_corrections(lesson_id)
    drills = db_service.get_drills(lesson_id)

    md = _generate_report_md(lesson, corrections, drills)
    filename = f"review_{lesson['date']}_{lesson_id}.md"
    filepath = REPORTS_DIR / filename
    filepath.write_text(md, encoding="utf-8")

    return {
        "filename": filename,
        "path": str(filepath),
        "corrections_count": len(corrections),
        "drills_count": len(drills),
        "content": md,
    }


@router.get("/reports/{filename}")
async def download_report(filename: str):
    filepath = REPORTS_DIR / filename
    if not filepath.exists():
        raise HTTPException(404, "Report not found")
    return FileResponse(filepath, media_type="text/markdown", filename=filename)
