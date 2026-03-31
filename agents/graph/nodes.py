import base64
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

import anthropic

from agents.schemas.state import MarkingState
from apps.api.config import settings
from apps.api.database import get_db


def _encode_image(path: str) -> str:
    with open(path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")


def _load_prompt(name: str, **kwargs: str) -> str:
    prompt_dir = Path(__file__).parent.parent / "prompts"
    template = (prompt_dir / f"{name}.txt").read_text()
    for k, v in kwargs.items():
        template = template.replace("{" + k + "}", v)
    return template


def _build_image_content(image_paths: list[str]) -> list[dict]:
    content = []
    for path in image_paths:
        content.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": _encode_image(path),
                },
            }
        )
    return content


def _call_claude_vision(
    client: anthropic.Anthropic, prompt: str, image_paths: list[str]
) -> str:
    content = _build_image_content(image_paths)
    content.append({"type": "text", "text": prompt})
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": content}],
    )
    return response.content[0].text


def _call_claude_text(client: anthropic.Anthropic, prompt: str) -> str:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


def _parse_json(raw: str, client: anthropic.Anthropic, context: str) -> dict:
    """Parse JSON response, retry once with a correction prompt if invalid."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        retry = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": context},
                {"role": "assistant", "content": raw},
                {
                    "role": "user",
                    "content": "Your previous response was not valid JSON. Please respond with valid JSON only, exactly matching the schema described.",
                },
            ],
        )
        return json.loads(retry.content[0].text)


async def ingestion_node(state: MarkingState) -> dict:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    page_paths = state["page_image_paths"]
    events = list(state.get("sse_events", []))

    try:
        prompt = _load_prompt("ingestion")
        raw = _call_claude_vision(client, prompt, page_paths)
        result = _parse_json(raw, client, prompt)
    except Exception as e:
        return {
            "ingestion_ok": False,
            "ingestion_errors": [str(e)],
            "sse_events": events
            + [{"type": "error", "payload": f"Ingestion failed: {e}"}],
        }

    pages = result.get("pages", [])
    errors = [
        f"Page {p['page_number']} quality too low (confidence: {p.get('confidence', 0):.2f})"
        for p in pages
        if not p.get("legible", True)
        or p.get("confidence", 1.0) < settings.min_page_quality
    ]
    ok = len(errors) == 0

    events.append(
        {
            "type": "status",
            "payload": f"Scan validated — {len(pages)} page(s)"
            if ok
            else f"Scan quality issues: {'; '.join(errors)}",
        }
    )

    return {
        "ingestion_ok": ok,
        "ingestion_errors": errors,
        "student_name": result.get("student_name"),
        "page_count": len(pages),
        "sse_events": events,
    }


async def marking_node(state: MarkingState) -> dict:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    page_paths = state["page_image_paths"]
    raw_marks: list[dict] = []
    errors: list[str] = []
    events = list(state.get("sse_events", []))

    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM rubric_questions WHERE assignment_id=? ORDER BY question_number",
            (state["assignment_id"],),
        )
        questions = [dict(r) for r in await cur.fetchall()]

    for q in questions:
        criteria = (
            json.loads(q["criteria"])
            if isinstance(q["criteria"], str)
            else q["criteria"]
        )
        prompt = _load_prompt(
            "marking",
            question_text=q["question_text"],
            max_marks=str(q["max_marks"]),
            criteria_json=json.dumps(criteria, indent=2),
        )
        try:
            raw = _call_claude_vision(client, prompt, page_paths)
            result = _parse_json(raw, client, prompt)
            raw_marks.append(
                {
                    "question_id": q["id"],
                    "question_number": q["question_number"],
                    "max_marks": q["max_marks"],
                    "awarded_marks": int(result.get("awarded_marks", 0)),
                    "rationale": result.get("rationale", ""),
                    "confidence": float(result.get("confidence", 0.5)),
                    "evidence_page": int(result.get("evidence_page", 1)),
                }
            )
            events.append(
                {
                    "type": "status",
                    "payload": f"Q{q['question_number']} marked: {result.get('awarded_marks', 0)}/{q['max_marks']}",
                }
            )
        except Exception as e:
            errors.append(f"Q{q['question_number']}: {e}")
            events.append(
                {
                    "type": "status",
                    "payload": f"Q{q['question_number']} marking failed: {e}",
                }
            )

    return {"raw_marks": raw_marks, "marking_errors": errors, "sse_events": events}


async def review_node(state: MarkingState) -> dict:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    raw_marks = state.get("raw_marks", [])
    threshold = settings.low_confidence_threshold
    reviewed: list[dict] = []
    flagged: list[str] = []
    events = list(state.get("sse_events", []))
    now = datetime.now(timezone.utc).isoformat()

    for mark in raw_marks:
        try:
            prompt = _load_prompt("review", rationale=mark["rationale"])
            raw = _call_claude_text(client, prompt)
            result = _parse_json(raw, client, prompt)
            feedback = result.get("feedback", mark["rationale"])
        except Exception:
            feedback = mark["rationale"]

        is_flagged = mark["confidence"] < threshold
        if is_flagged:
            flagged.append(mark["question_id"])

        reviewed.append({**mark, "feedback": feedback, "flagged": is_flagged})

    # Persist to DB
    async with get_db() as db:
        for m in reviewed:
            await db.execute(
                """INSERT INTO marks
                   (id, submission_id, question_id, awarded_marks, max_marks,
                    rationale, feedback, confidence, evidence_page, approved, flagged)
                   VALUES (?,?,?,?,?,?,?,?,?,0,?)""",
                (
                    str(uuid.uuid4()),
                    state["submission_id"],
                    m["question_id"],
                    m["awarded_marks"],
                    m["max_marks"],
                    m["rationale"],
                    m["feedback"],
                    m["confidence"],
                    m["evidence_page"],
                    1 if m["flagged"] else 0,
                ),
            )

        student_name = state.get("student_name")
        if student_name:
            await db.execute(
                "UPDATE submissions SET status='marked', student_name=? WHERE id=?",
                (student_name, state["submission_id"]),
            )
        else:
            await db.execute(
                "UPDATE submissions SET status='marked' WHERE id=?",
                (state["submission_id"],),
            )

        total = sum(m["awarded_marks"] for m in reviewed)
        await db.execute(
            """INSERT INTO audit_log(id, submission_id, event, detail, created_at)
               VALUES (?,?,?,?,?)""",
            (
                str(uuid.uuid4()),
                state["submission_id"],
                "marked",
                json.dumps({"total_marks": total, "flagged_count": len(flagged)}),
                now,
            ),
        )
        await db.commit()

    total = sum(m["awarded_marks"] for m in reviewed)
    events.append(
        {"type": "done", "payload": {"total_marks": total, "flagged": len(flagged)}}
    )

    return {
        "reviewed_marks": reviewed,
        "low_confidence_flags": flagged,
        "sse_events": events,
    }
