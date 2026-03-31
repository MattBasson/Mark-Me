from typing import Optional, TypedDict


class MarkingState(TypedDict, total=False):
    # Input
    submission_id: str
    assignment_id: str
    page_image_paths: list[str]

    # After ingestion node
    ingestion_ok: bool
    ingestion_errors: list[str]
    student_name: Optional[str]
    page_count: int

    # After marking node
    raw_marks: list[dict]
    marking_errors: list[str]

    # After review node
    reviewed_marks: list[dict]
    low_confidence_flags: list[str]

    # SSE events accumulated per node
    sse_events: list[dict]
