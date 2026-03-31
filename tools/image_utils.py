from pathlib import Path
from PIL import Image

from apps.api.config import settings


def process_upload(upload_path: Path, submission_id: str) -> list[str]:
    """
    Convert an uploaded file (PDF or image) into per-page JPEGs.
    Returns list of absolute paths for each extracted page.
    """
    out_dir = settings.processed_dir / submission_id
    out_dir.mkdir(parents=True, exist_ok=True)

    suffix = upload_path.suffix.lower()
    page_paths: list[str] = []

    if suffix == ".pdf":
        from pdf2image import convert_from_path

        images = convert_from_path(str(upload_path), dpi=200)
        for i, img in enumerate(images, start=1):
            out_path = out_dir / f"page_{i}.jpg"
            img.convert("RGB").save(str(out_path), "JPEG", quality=90)
            page_paths.append(str(out_path))
    else:
        img = Image.open(upload_path).convert("RGB")
        out_path = out_dir / "page_1.jpg"
        img.save(str(out_path), "JPEG", quality=90)
        page_paths.append(str(out_path))

    return page_paths
