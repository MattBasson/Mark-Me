from contextlib import asynccontextmanager
import aiosqlite
from apps.api.config import settings

CREATE_TABLES = """
CREATE TABLE IF NOT EXISTS assignments (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    subject     TEXT NOT NULL,
    total_marks INTEGER NOT NULL,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rubric_questions (
    id              TEXT PRIMARY KEY,
    assignment_id   TEXT NOT NULL REFERENCES assignments(id),
    question_number INTEGER NOT NULL,
    question_text   TEXT NOT NULL,
    max_marks       INTEGER NOT NULL,
    criteria        TEXT NOT NULL,
    guidance        TEXT
);

CREATE TABLE IF NOT EXISTS submissions (
    id              TEXT PRIMARY KEY,
    assignment_id   TEXT NOT NULL REFERENCES assignments(id),
    student_name    TEXT,
    student_ref     TEXT,
    upload_path     TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'uploaded',
    created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS submission_pages (
    id              TEXT PRIMARY KEY,
    submission_id   TEXT NOT NULL REFERENCES submissions(id),
    page_number     INTEGER NOT NULL,
    image_path      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS marks (
    id                          TEXT PRIMARY KEY,
    submission_id               TEXT NOT NULL REFERENCES submissions(id),
    question_id                 TEXT NOT NULL REFERENCES rubric_questions(id),
    awarded_marks               INTEGER,
    max_marks                   INTEGER NOT NULL,
    rationale                   TEXT,
    feedback                    TEXT,
    confidence                  REAL,
    evidence_page               INTEGER,
    teacher_override_marks      INTEGER,
    teacher_override_comment    TEXT,
    approved                    INTEGER NOT NULL DEFAULT 0,
    approved_at                 TEXT,
    flagged                     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_log (
    id              TEXT PRIMARY KEY,
    submission_id   TEXT NOT NULL REFERENCES submissions(id),
    event           TEXT NOT NULL,
    detail          TEXT,
    created_at      TEXT NOT NULL
);
"""


async def init_db() -> None:
    async with aiosqlite.connect(settings.db_path) as db:
        await db.executescript(CREATE_TABLES)
        await db.commit()


@asynccontextmanager
async def get_db():
    async with aiosqlite.connect(settings.db_path) as db:
        db.row_factory = aiosqlite.Row
        yield db
