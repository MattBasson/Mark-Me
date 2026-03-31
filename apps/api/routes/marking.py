import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from apps.api.database import get_db
from agents.graph.supervisor import run_graph

router = APIRouter()


@router.get("/{submission_id}/mark")
async def mark_submission(submission_id: str):
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM submissions WHERE id=?", (submission_id,)
        )
        sub = await cur.fetchone()
        if not sub:
            raise HTTPException(404, "Submission not found")
        sub = dict(sub)

        cur = await db.execute(
            "SELECT image_path FROM submission_pages WHERE submission_id=? ORDER BY page_number",
            (submission_id,),
        )
        pages = await cur.fetchall()

    page_paths = [r["image_path"] for r in pages]
    if not page_paths:
        raise HTTPException(400, "No pages found for this submission")

    # Clear any previous marks before re-marking
    async with get_db() as db:
        await db.execute(
            "DELETE FROM marks WHERE submission_id=?", (submission_id,)
        )
        await db.execute(
            "UPDATE submissions SET status='processing' WHERE id=?", (submission_id,)
        )
        await db.commit()

    async def event_stream():
        try:
            async for event in run_graph(
                submission_id, sub["assignment_id"], page_paths
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'payload': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


class MarkUpdate(BaseModel):
    awarded_marks: Optional[int] = None
    teacher_override_comment: Optional[str] = None


@router.patch("/{submission_id}/marks/{mark_id}")
async def update_mark(submission_id: str, mark_id: str, body: MarkUpdate):
    async with get_db() as db:
        cur = await db.execute(
            "SELECT id FROM marks WHERE id=? AND submission_id=?",
            (mark_id, submission_id),
        )
        if not await cur.fetchone():
            raise HTTPException(404, "Mark not found")

        updates = []
        values = []
        if body.awarded_marks is not None:
            updates.append("teacher_override_marks=?")
            values.append(body.awarded_marks)
        if body.teacher_override_comment is not None:
            updates.append("teacher_override_comment=?")
            values.append(body.teacher_override_comment)

        if updates:
            values.extend([mark_id, submission_id])
            await db.execute(
                f"UPDATE marks SET {', '.join(updates)} WHERE id=? AND submission_id=?",
                values,
            )

        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            """INSERT INTO audit_log(id, submission_id, event, detail, created_at)
               VALUES (?,?,?,?,?)""",
            (
                str(uuid.uuid4()),
                submission_id,
                "teacher_edit",
                json.dumps(body.model_dump(exclude_none=True)),
                now,
            ),
        )
        await db.commit()

    return {"ok": True}


@router.post("/{submission_id}/approve")
async def approve_submission(submission_id: str):
    now = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        cur = await db.execute(
            "SELECT COUNT(*) as cnt FROM marks WHERE submission_id=?",
            (submission_id,),
        )
        row = await cur.fetchone()
        if row["cnt"] == 0:
            raise HTTPException(400, "No marks to approve — run marking first")

        await db.execute(
            "UPDATE marks SET approved=1, approved_at=? WHERE submission_id=?",
            (now, submission_id),
        )
        await db.execute(
            "UPDATE submissions SET status='approved' WHERE id=?", (submission_id,)
        )
        await db.execute(
            """INSERT INTO audit_log(id, submission_id, event, detail, created_at)
               VALUES (?,?,?,?,?)""",
            (str(uuid.uuid4()), submission_id, "approved", None, now),
        )
        await db.commit()

    return {"ok": True}


@router.get("/{submission_id}/export")
async def export_submission(submission_id: str):
    async with get_db() as db:
        cur = await db.execute(
            "SELECT COUNT(*) as cnt FROM marks WHERE submission_id=? AND approved=0",
            (submission_id,),
        )
        row = await cur.fetchone()
        if row["cnt"] > 0:
            raise HTTPException(
                400, "All marks must be approved before export"
            )

        cur = await db.execute(
            "SELECT * FROM submissions WHERE id=?", (submission_id,)
        )
        sub = await cur.fetchone()
        if not sub:
            raise HTTPException(404, "Submission not found")

        cur = await db.execute(
            """SELECT m.*, rq.question_number, rq.question_text
               FROM marks m
               JOIN rubric_questions rq ON m.question_id=rq.id
               WHERE m.submission_id=?
               ORDER BY rq.question_number""",
            (submission_id,),
        )
        marks = [dict(r) for r in await cur.fetchall()]

    from tools.pdf_export import export_pdf
    from fastapi.responses import FileResponse

    pdf_path = export_pdf(dict(sub), marks)
    return FileResponse(
        str(pdf_path),
        media_type="application/pdf",
        filename=f"marked_{submission_id[:8]}.pdf",
    )
