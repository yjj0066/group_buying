import os
import time

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException

from app.config import get_settings
from app.tracking_mapper import build_receipt_job, build_tracking_job
from app.upstage_client import (
    decode_input_bytes,
    extract_receipt_with_upstage,
    extract_tracking_with_upstage,
)

app = Flask(__name__)


@app.errorhandler(HTTPException)
def handle_http_exception(error: HTTPException):
    return jsonify({"message": error.description or error.name}), error.code


@app.errorhandler(Exception)
def handle_unexpected_exception(error: Exception):
    app.logger.exception("document-ai-bff unhandled error")
    return jsonify({"message": f"Internal server error: {error}"}), 500


def _require_shared_secret() -> tuple[bool, tuple]:
    settings = get_settings()

    if not settings.hybrid_shared_secret:
        return True, ()

    provided = request.headers.get("X-Hybrid-Shared-Secret", "")

    if provided != settings.hybrid_shared_secret:
        return False, (jsonify({"message": "Unauthorized"}), 401)

    return True, ()


def _auto_verify_confidence() -> float:
    raw = os.getenv("DOCUMENT_AI_AUTO_VERIFY_CONFIDENCE", "0.85")

    try:
        value = float(raw)
    except ValueError:
        return 0.85

    return value if 0 < value <= 1 else 0.85


@app.get("/health")
def health():
    settings = get_settings()
    return jsonify(
        {
            "status": "ok",
            "upstage_configured": bool(settings.upstage_api_key),
            "receipt_mode": settings.upstage_receipt_mode,
            "pipeline": "document-parse + information-extract",
        }
    )


@app.post("/api/v1/document-ai/receipts/parse")
def parse_receipt():
    ok, error_response = _require_shared_secret()
    if not ok:
        return error_response

    settings = get_settings()

    if not settings.upstage_api_key:
        return jsonify({"message": "UPSTAGE_API_KEY is not configured"}), 503

    body = request.get_json(silent=True) or {}
    partner_group_deal_id = str(body.get("partner_group_deal_id") or "unknown")
    payload_json = body.get("input_payload_json") or {}

    declared_album_quantity = payload_json.get("declared_album_quantity")
    primary_seller = payload_json.get("primary_seller")

    try:
        declared_qty = (
            int(declared_album_quantity)
            if declared_album_quantity is not None
            else None
        )
    except (TypeError, ValueError):
        declared_qty = None

    primary_seller_str = (
        str(primary_seller).strip() if primary_seller is not None else None
    )

    try:
        file_bytes, filename, mime_type = decode_input_bytes(
            body.get("input_base64"),
            body.get("input_url"),
        )
    except ValueError as error:
        return jsonify({"message": str(error)}), 400
    except Exception as error:
        return jsonify({"message": f"Failed to load document: {error}"}), 400

    try:
        receipt_fields, parse_markdown = extract_receipt_with_upstage(
            api_key=settings.upstage_api_key,
            file_bytes=file_bytes,
            filename=filename,
            mime_type=mime_type,
            mode=settings.upstage_receipt_mode,
            timeout_sec=settings.upstage_timeout_sec,
            declared_album_quantity=declared_qty,
            primary_seller=primary_seller_str,
            use_document_parse=settings.receipt_use_document_parse,
        )
    except Exception as error:
        detail = str(error)
        return jsonify(
            {
                "message": f"Upstage receipt extraction failed: {detail}",
                "error": detail,
            }
        ), 502

    job = build_receipt_job(
        partner_group_deal_id=partner_group_deal_id,
        receipt_fields=receipt_fields,
        parse_markdown=parse_markdown,
        auto_verify_confidence=_auto_verify_confidence(),
    )

    return jsonify({"job": job})


@app.post("/api/v1/document-ai/tracking/parse")
def parse_tracking():
    ok, error_response = _require_shared_secret()
    if not ok:
        return error_response

    settings = get_settings()

    if not settings.upstage_api_key:
        return jsonify({"message": "UPSTAGE_API_KEY is not configured"}), 503

    body = request.get_json(silent=True) or {}
    partner_group_deal_id = str(body.get("partner_group_deal_id") or "unknown")

    try:
        file_bytes, filename, mime_type = decode_input_bytes(
            body.get("input_base64"),
            body.get("input_url"),
        )
    except ValueError as error:
        return jsonify({"message": str(error)}), 400
    except Exception as error:
        return jsonify({"message": f"Failed to load document: {error}"}), 400

    try:
        invoice_rows, parse_markdown = extract_tracking_with_upstage(
            api_key=settings.upstage_api_key,
            file_bytes=file_bytes,
            filename=filename,
            mime_type=mime_type,
            timeout_sec=settings.upstage_timeout_sec,
        )
    except Exception as error:
        detail = str(error)
        return jsonify(
            {
                "message": f"Upstage tracking extraction failed: {detail}",
                "error": detail,
            }
        ), 502

    if not invoice_rows:
        return jsonify({"message": "No tracking rows extracted from document"}), 422

    job = build_tracking_job(
        partner_group_deal_id=partner_group_deal_id,
        invoice_rows=invoice_rows,
        parse_markdown=parse_markdown,
        auto_verify_confidence=_auto_verify_confidence(),
    )

    return jsonify({"job": job})


@app.get("/api/v1/document-ai/jobs/<job_id>")
def get_job(job_id: str):
    ok, error_response = _require_shared_secret()
    if not ok:
        return error_response

    return jsonify(
        {
            "job": {
                "id": job_id,
                "status": "completed",
                "confidence": 0.9,
                "needs_review": False,
            }
        }
    )


def main():
    settings = get_settings()
    app.run(host="0.0.0.0", port=settings.port, debug=settings.debug)


if __name__ == "__main__":
    main()
