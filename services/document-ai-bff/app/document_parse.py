from typing import Any

import requests

UPSTAGE_DOCUMENT_PARSE_URL = "https://api.upstage.ai/v1/document-digitization"


def parse_document_with_upstage(
    *,
    api_key: str,
    file_bytes: bytes,
    filename: str,
    timeout_sec: int,
) -> dict[str, Any]:
    """
    Upstage Document Parse (DOCS-01).
    Returns layout-aware markdown/html text for downstream extraction.
    """
    response = requests.post(
        UPSTAGE_DOCUMENT_PARSE_URL,
        headers={"Authorization": f"Bearer {api_key}"},
        files={"document": (filename, file_bytes)},
        data={
            "model": "document-parse",
            "ocr": "force",
            "output_formats": '["markdown"]',
        },
        timeout=timeout_sec,
    )
    response.raise_for_status()
    body = response.json()

    content = body.get("content") or {}
    markdown = ""

    if isinstance(content, dict):
        markdown = str(content.get("markdown") or content.get("text") or "")
    elif isinstance(content, str):
        markdown = content

    if not markdown and isinstance(body.get("markdown"), str):
        markdown = body["markdown"]

    return {
        "markdown": markdown.strip(),
        "raw": body,
    }
