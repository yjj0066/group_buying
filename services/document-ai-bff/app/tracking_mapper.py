import time
import uuid
from typing import Any


def build_receipt_job(
    *,
    partner_group_deal_id: str,
    receipt_fields: dict[str, Any],
    parse_markdown: str | None = None,
    auto_verify_confidence: float = 0.85,
) -> dict[str, Any]:
    confidence = float(receipt_fields.get("confidence") or 0)
    needs_review = confidence < auto_verify_confidence

    missing = [
        key
        for key in ("seller", "order_number", "album_quantity")
        if not receipt_fields.get(key)
    ]

    if missing:
        needs_review = True

    job_id = f"receipt-{partner_group_deal_id}-{int(time.time())}-{uuid.uuid4().hex[:8]}"

    return {
        "id": job_id,
        "job_type": "receipt_parse",
        "status": "completed",
        "confidence": confidence,
        "needs_review": needs_review,
        "review_reason": f"MISSING_FIELDS:{','.join(missing)}" if missing else None,
        "parse_result_json": {
            "markdown": parse_markdown,
        }
        if parse_markdown
        else None,
        "extract_result_json": {
            "receipt_fields": receipt_fields,
        },
    }


def build_tracking_job(
    *,
    partner_group_deal_id: str,
    invoice_rows: list[dict[str, Any]],
    parse_markdown: str | None = None,
    auto_verify_confidence: float = 0.85,
) -> dict[str, Any]:
    confidences = [
        float(row.get("confidence"))
        for row in invoice_rows
        if row.get("confidence") is not None
    ]
    confidence = (
        round(sum(confidences) / len(confidences), 4) if confidences else 0.75
    )

    needs_review = any(
        row.get("needs_review")
        or float(row.get("confidence") or 0) < auto_verify_confidence
        or not row.get("tracking_number")
        for row in invoice_rows
    )

    job_id = f"tracking-{partner_group_deal_id}-{int(time.time())}-{uuid.uuid4().hex[:8]}"

    return {
        "id": job_id,
        "job_type": "tracking_parse",
        "status": "completed",
        "confidence": confidence,
        "needs_review": needs_review,
        "parse_result_json": {
            "markdown": parse_markdown,
        }
        if parse_markdown
        else None,
        "extract_result_json": {
            "invoice_rows": invoice_rows,
        },
    }
