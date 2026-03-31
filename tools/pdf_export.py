from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from apps.api.config import settings


def export_pdf(submission: dict, marks: list[dict]) -> Path:
    sub_id = submission["id"]
    out_path = settings.export_dir / f"marked_{sub_id[:8]}.pdf"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(str(out_path), pagesize=A4)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("Mark-Me — Marked Paper Summary", styles["Title"]))
    story.append(Spacer(1, 0.3 * cm))

    student = submission.get("student_name") or "Unknown Student"
    story.append(Paragraph(f"<b>Student:</b> {student}", styles["Normal"]))
    story.append(Paragraph(f"<b>Submission ID:</b> {sub_id[:8]}", styles["Normal"]))
    story.append(Paragraph(f"<b>Status:</b> {submission.get('status', '')}", styles["Normal"]))
    story.append(Spacer(1, 0.5 * cm))

    table_data = [["Q#", "Max", "Awarded", "Conf.", "Feedback"]]
    total_max = 0
    total_awarded = 0

    for m in marks:
        awarded = (
            m.get("teacher_override_marks")
            if m.get("teacher_override_marks") is not None
            else m.get("awarded_marks", 0)
        )
        conf_pct = (
            f"{int((m.get('confidence') or 0) * 100)}%"
            if m.get("confidence") is not None
            else "—"
        )
        feedback = m.get("teacher_override_comment") or m.get("feedback") or ""
        table_data.append(
            [
                str(m.get("question_number", "?")),
                str(m["max_marks"]),
                str(awarded),
                conf_pct,
                feedback[:120] + ("…" if len(feedback) > 120 else ""),
            ]
        )
        total_max += m["max_marks"]
        total_awarded += awarded or 0

    table_data.append(["TOTAL", str(total_max), str(total_awarded), "", ""])

    t = Table(
        table_data,
        colWidths=[1 * cm, 1.5 * cm, 2 * cm, 1.8 * cm, 10 * cm],
    )
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F46E5")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#F5F5F5")]),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("LINEABOVE", (0, -1), (-1, -1), 1, colors.black),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#D1D5DB")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(t)
    doc.build(story)
    return out_path
