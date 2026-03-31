import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from apps.api.database import get_db

router = APIRouter()


class AssignmentCreate(BaseModel):
    title: str
    subject: str
    total_marks: int


class RubricQuestion(BaseModel):
    question_number: int
    question_text: str
    max_marks: int
    criteria: list[str]
    guidance: Optional[str] = None


@router.post("")
async def create_assignment(body: AssignmentCreate):
    aid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    async with get_db() as db:
        await db.execute(
            "INSERT INTO assignments(id, title, subject, total_marks, created_at) VALUES (?,?,?,?,?)",
            (aid, body.title, body.subject, body.total_marks, now),
        )
        await db.commit()
    return {"id": aid}


@router.get("")
async def list_assignments():
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM assignments ORDER BY created_at DESC")
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.get("/{assignment_id}")
async def get_assignment(assignment_id: str):
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM assignments WHERE id=?", (assignment_id,))
        row = await cur.fetchone()
        if not row:
            raise HTTPException(404, "Assignment not found")
        assignment = dict(row)
        cur = await db.execute(
            "SELECT * FROM rubric_questions WHERE assignment_id=? ORDER BY question_number",
            (assignment_id,),
        )
        questions = await cur.fetchall()
    assignment["questions"] = [
        {**dict(q), "criteria": json.loads(q["criteria"])} for q in questions
    ]
    return assignment


@router.post("/{assignment_id}/rubric")
async def upsert_rubric(assignment_id: str, questions: list[RubricQuestion]):
    async with get_db() as db:
        cur = await db.execute("SELECT id FROM assignments WHERE id=?", (assignment_id,))
        if not await cur.fetchone():
            raise HTTPException(404, "Assignment not found")
        await db.execute(
            "DELETE FROM rubric_questions WHERE assignment_id=?", (assignment_id,)
        )
        for q in questions:
            await db.execute(
                """INSERT INTO rubric_questions
                   (id, assignment_id, question_number, question_text, max_marks, criteria, guidance)
                   VALUES (?,?,?,?,?,?,?)""",
                (
                    str(uuid.uuid4()),
                    assignment_id,
                    q.question_number,
                    q.question_text,
                    q.max_marks,
                    json.dumps(q.criteria),
                    q.guidance,
                ),
            )
        await db.commit()
    return {"ok": True}


@router.delete("/{assignment_id}")
async def delete_assignment(assignment_id: str):
    async with get_db() as db:
        await db.execute(
            "DELETE FROM rubric_questions WHERE assignment_id=?", (assignment_id,)
        )
        await db.execute("DELETE FROM assignments WHERE id=?", (assignment_id,))
        await db.commit()
    return {"ok": True}
