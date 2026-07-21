import time
import uuid
from typing import Any


def build_receipt_job(
    *,
    partner_group_deal_id: str,
    receipt_fields: dict[str, Any],
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
        "extract_result_json": {
            "receipt_fields": receipt_fields,
        },
    }
