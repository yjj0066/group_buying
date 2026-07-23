import base64
import json
import re
from typing import Any

import requests
from openai import OpenAI

from app.document_parse import parse_document_with_upstage
from app.schemas import (
    build_receipt_response_format,
    build_tracking_response_format,
)

UPSTAGE_IE_BASE_URL = "https://api.upstage.ai/v1/information-extraction"
UPSTAGE_IE_URL = UPSTAGE_IE_BASE_URL


def create_upstage_ie_client(api_key: str) -> OpenAI:
    return OpenAI(api_key=api_key, base_url=UPSTAGE_IE_BASE_URL)


def encode_bytes_to_data_url(file_bytes: bytes, mime_type: str) -> str:
    encoded = base64.b64encode(file_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


def decode_input_bytes(
    input_base64: str | None, input_url: str | None
) -> tuple[bytes, str, str]:
    if input_base64:
        match = re.match(r"^data:([^;]+);base64,(.+)$", input_base64, re.DOTALL)
        if match:
            mime = match.group(1)
            raw = base64.b64decode(match.group(2))
            ext = "png" if "png" in mime else "jpg"
            return raw, f"document.{ext}", mime

        raw = base64.b64decode(input_base64)
        return raw, "document.bin", "application/octet-stream"

    if input_url:
        try:
            response = requests.get(input_url, timeout=60)
            response.raise_for_status()
        except requests.RequestException as error:
            raise ValueError(
                f"Failed to download document from input_url ({input_url}): {error}"
            ) from error

        content_type = response.headers.get("Content-Type", "image/jpeg")

        if "text/html" in content_type.lower():
            raise ValueError(
                f"input_url returned HTML instead of an image ({input_url}). "
                "Check MEDUSA_BACKEND_URL and that uploaded files are publicly reachable."
            )

        ext = "png" if "png" in content_type else "jpg"
        return response.content, f"document.{ext}", content_type

    raise ValueError("Provide input_base64 or input_url")


def _parse_amount(value: Any) -> float | None:
    if value is None:
        return None

    try:
        return float(str(value).replace(",", "").replace("₩", "").replace("원", "").strip())
    except ValueError:
        return None


def _average_confidence(fields: list[dict[str, Any]]) -> float:
    scores = [
        float(item["confidence"])
        for item in fields
        if item.get("confidence") is not None
    ]

    return round(sum(scores) / len(scores), 4) if scores else 0.75


def parse_ie_message_content(content: Any) -> dict[str, Any]:
    if isinstance(content, str):
        return json.loads(content or "{}")

    if isinstance(content, dict):
        return content

    return {}


def _map_prebuilt_receipt_fields(fields: list[dict[str, Any]]) -> dict[str, Any]:
    by_key: dict[str, Any] = {}

    for field in fields:
        key = str(field.get("key") or "")
        if key:
            by_key[key] = field.get("value")

    return {
        "seller": by_key.get("store_name") or by_key.get("merchant") or by_key.get("store"),
        "order_number": by_key.get("order_number") or by_key.get("transaction_id"),
        "ordered_at": by_key.get("date") or by_key.get("time"),
        "album_quantity": None,
        "total_amount": _parse_amount(by_key.get("total") or by_key.get("amount")),
        "confidence": _average_confidence(fields),
    }


def _map_receipt_content(content: dict[str, Any]) -> dict[str, Any]:
    album_qty = content.get("album_quantity") or content.get("quantity")

    try:
        album_quantity = int(album_qty) if album_qty is not None else None
    except (TypeError, ValueError):
        album_quantity = None

    confidence = content.get("confidence")
    if confidence is None:
        confidence = 0.88

    return {
        "seller": content.get("seller") or content.get("store_name"),
        "order_number": content.get("order_number") or content.get("order_id"),
        "ordered_at": content.get("ordered_at") or content.get("order_date"),
        "album_quantity": album_quantity,
        "total_amount": _parse_amount(content.get("total_amount") or content.get("total")),
        "confidence": float(confidence),
    }


def _map_tracking_rows(content: dict[str, Any], default_confidence: float = 0.88) -> list[dict[str, Any]]:
    rows = content.get("invoice_rows") or content.get("tracking_rows") or content.get("rows") or []

    if not isinstance(rows, list):
        return []

    mapped: list[dict[str, Any]] = []

    for row in rows:
        if not isinstance(row, dict):
            continue

        confidence = row.get("confidence")
        if confidence is None:
            confidence = default_confidence

        confidence_value = float(confidence)
        tracking_number = str(row.get("tracking_number") or row.get("waybill_number") or "").strip()

        mapped.append(
            {
                "recipient_name": row.get("recipient_name") or row.get("receiver_name") or row.get("name"),
                "carrier": row.get("carrier") or row.get("courier") or row.get("shipping_company"),
                "tracking_number": tracking_number or None,
                "address_hint": row.get("address_hint") or row.get("address"),
                "confidence": confidence_value,
                "needs_review": confidence_value < 0.85 or not tracking_number,
            }
        )

    return mapped


def _run_information_extract(
    *,
    api_key: str,
    file_bytes: bytes,
    mime_type: str,
    response_format: dict[str, Any],
    timeout_sec: int,
) -> dict[str, Any]:
    client = create_upstage_ie_client(api_key)
    data_url = encode_bytes_to_data_url(file_bytes, mime_type)

    # Upstage IE accepts exactly one content item (image_url only).
    extraction_response = client.chat.completions.create(
        model="information-extract",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }
        ],
        response_format=response_format,
        timeout=timeout_sec,
    )

    message_content = extraction_response.choices[0].message.content
    return parse_ie_message_content(message_content)


def extract_receipt_prebuilt(
    *, api_key: str, file_bytes: bytes, filename: str, timeout_sec: int
) -> tuple[dict[str, Any], str | None]:
    parse_result = parse_document_with_upstage(
        api_key=api_key,
        file_bytes=file_bytes,
        filename=filename,
        timeout_sec=timeout_sec,
    )

    response = requests.post(
        UPSTAGE_IE_URL,
        headers={"Authorization": f"Bearer {api_key}"},
        files={"document": (filename, file_bytes)},
        data={"model": "receipt-extraction"},
        timeout=timeout_sec,
    )
    response.raise_for_status()
    body = response.json()

    return _map_prebuilt_receipt_fields(body.get("fields") or []), parse_result.get("markdown")


def extract_receipt_with_pipeline(
    *,
    api_key: str,
    file_bytes: bytes,
    filename: str,
    mime_type: str,
    timeout_sec: int,
    declared_album_quantity: int | None = None,
    primary_seller: str | None = None,
    use_document_parse: bool = False,
) -> tuple[dict[str, Any], str | None]:
    parse_markdown = ""

    if use_document_parse:
        parse_result = parse_document_with_upstage(
            api_key=api_key,
            file_bytes=file_bytes,
            filename=filename,
            timeout_sec=timeout_sec,
        )
        parse_markdown = parse_result.get("markdown") or ""

    parsed = _run_information_extract(
        api_key=api_key,
        file_bytes=file_bytes,
        mime_type=mime_type,
        response_format=build_receipt_response_format(
            declared_album_quantity=declared_album_quantity,
            primary_seller=primary_seller,
            parse_markdown=parse_markdown or None,
        ),
        timeout_sec=timeout_sec,
    )

    mapped = _map_receipt_content(parsed)

    if primary_seller and not mapped.get("seller"):
        mapped["seller"] = primary_seller

    return mapped, parse_markdown or None


def extract_tracking_with_pipeline(
    *,
    api_key: str,
    file_bytes: bytes,
    filename: str,
    mime_type: str,
    timeout_sec: int,
) -> tuple[list[dict[str, Any]], str | None]:
    parse_result = parse_document_with_upstage(
        api_key=api_key,
        file_bytes=file_bytes,
        filename=filename,
        timeout_sec=timeout_sec,
    )
    parse_markdown = parse_result.get("markdown") or ""

    parsed = _run_information_extract(
        api_key=api_key,
        file_bytes=file_bytes,
        mime_type=mime_type,
        response_format=build_tracking_response_format(
            parse_markdown=parse_markdown or None,
        ),
        timeout_sec=timeout_sec,
    )

    return _map_tracking_rows(parsed), parse_markdown or None


def extract_receipt_with_upstage(
    *,
    api_key: str,
    file_bytes: bytes,
    filename: str,
    mime_type: str,
    mode: str,
    timeout_sec: int,
    declared_album_quantity: int | None = None,
    primary_seller: str | None = None,
    use_document_parse: bool = False,
) -> tuple[dict[str, Any], str | None]:
    if mode == "receipt-extraction":
        fields, markdown = extract_receipt_prebuilt(
            api_key=api_key,
            file_bytes=file_bytes,
            filename=filename,
            timeout_sec=timeout_sec,
        )
        return fields, markdown

    return extract_receipt_with_pipeline(
        api_key=api_key,
        file_bytes=file_bytes,
        filename=filename,
        mime_type=mime_type,
        timeout_sec=timeout_sec,
        declared_album_quantity=declared_album_quantity,
        primary_seller=primary_seller,
        use_document_parse=use_document_parse,
    )


def extract_tracking_with_upstage(
    *,
    api_key: str,
    file_bytes: bytes,
    filename: str,
    mime_type: str,
    timeout_sec: int,
) -> tuple[list[dict[str, Any]], str | None]:
    return extract_tracking_with_pipeline(
        api_key=api_key,
        file_bytes=file_bytes,
        filename=filename,
        mime_type=mime_type,
        timeout_sec=timeout_sec,
    )
