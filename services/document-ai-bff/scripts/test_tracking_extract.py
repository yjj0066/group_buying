"""Test tracking extract with Document Parse + Information Extract."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

load_dotenv(ROOT / ".env")

from app.config import get_settings
from app.upstage_client import extract_tracking_with_upstage


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/test_tracking_extract.py <image-path>")
        return 1

    image_path = Path(sys.argv[1])

    if not image_path.is_file():
        print(f"File not found: {image_path}")
        return 1

    settings = get_settings()

    if not settings.upstage_api_key:
        print("UPSTAGE_API_KEY is missing in .env")
        return 1

    file_bytes = image_path.read_bytes()
    suffix = image_path.suffix.lower()
    mime_type = "image/png" if suffix == ".png" else "image/jpeg"

    print(f"Extracting tracking rows from {image_path.name}...")

    rows, markdown = extract_tracking_with_upstage(
        api_key=settings.upstage_api_key,
        file_bytes=file_bytes,
        filename=image_path.name,
        mime_type=mime_type,
        timeout_sec=settings.upstage_timeout_sec,
    )

    print(json.dumps({"invoice_rows": rows, "parse_markdown_preview": (markdown or "")[:500]}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
