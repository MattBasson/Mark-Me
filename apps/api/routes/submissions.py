import uuid
from datetime import datetime, timezone
from pathlib import Path

import aiofiles
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from apps.api.config import settings
from apps.api.database import get_db
from tools.image_utils import process_upload

router = APIRouter()


@router.post("/upload")
async def upload_submission(
    assignment_id: str = Form(...),
    file: UploadFile = File(...),
):
    async with get_db() as db:
        cur = await db.execute("SELECT id FROM assignments WHERE id=?", (assignment_id,))
        if not await cur.fetchone():
            raise HTTPException(404, "Assignment not found")

    sub_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    suffix = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    if suffix not in (".jpg", ".jpeg", ".png", ".pdf"):
        raise HTTPException(400, "Unsupported file type. Use JPG, PNG, or PDF.")

    upload_path = settings.upload_dir / f"{sub_id}{suffix}"
    async with aiofiles.open(upload_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    page_paths = process_upload(upload_path, sub_id)

    async with get_db() as db:
        await db.execute(
            """INSERT INTO submissions(id, assignment_id, upload_path, status, created_at)
               VALUES (?,?,?,?,?)""",
            (sub_id, assignment_id, str(upload_path), "uploaded", now),
        )
        for i, path in enumerate(page_paths, start=1):
            await db.execute(
                """INSERT INTO submission_pages(id, submission_id, page_number, image_path)
                   VALUES (?,?,?,?)""",
                (str(uuid.uuid4()), sub_id, i, path),
            )
        await db.commit()

    return {"id": sub_id, "page_count": len(page_paths)}


@router.get("")
async def list_submissions(assignment_id: str | None = None):
    async with get_db() as db:
        if assignment_id:
            cur = await db.execute(
                "SELECT * FROM submissions WHERE assignment_id=? ORDER BY created_at DESC",
                (assignment_id,),
            )
        else:
            cur = await db.execute(
                "SELECT * FROM submissions ORDER BY created_at DESC"
            )
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.get("/{submission_id}")
async def get_submission(submission_id: str):
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM submissions WHERE id=?", (submission_id,)
        )
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404, "Submission not found")
    return dict(row)


@router.get("/{submission_id}/pages")
async def get_pages(submission_id: str):
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM submission_pages WHERE submission_id=? ORDER BY page_number",
            (submission_id,),
        )
        rows = await cur.fetchall()
    pages = []
    for r in rows:
        img_path = Path(dict(r)["image_path"])
        pages.append(
            {
                "page_number": r["page_number"],
                "url": f"/processed/{submission_id}/{img_path.name}",
            }
        )
    return pages


@router.get("/{submission_id}/marks")
async def get_marks(submission_id: str):
    import json

    async with get_db() as db:
        cur = await db.execute(
            """SELECT m.*, rq.question_number, rq.question_text, rq.criteria
               FROM marks m
               JOIN rubric_questions rq ON m.question_id = rq.id
               WHERE m.submission_id=?
               ORDER BY rq.question_number""",
            (submission_id,),
        )
        rows = await cur.fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["criteria"] = json.loads(d["criteria"])
        result.append(d)
    return result
