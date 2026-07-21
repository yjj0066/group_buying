"""Upstage Information Extract JSON schemas for group-buying documents."""

import copy
from typing import Any

GROUP_BUY_RECEIPT_RESPONSE_FORMAT: dict[str, Any] = {
    "type": "json_schema",
    "json_schema": {
        "name": "group_buy_purchase_receipt",
        "schema": {
            "type": "object",
            "properties": {
                "seller": {
                    "type": "string",
                    "description": "Store or platform name (e.g. Weverse Shop, YES24, KTOWN4U)",
                },
                "order_number": {
                    "type": "string",
                    "description": "Order ID or order number shown on the receipt screenshot",
                },
                "ordered_at": {
                    "type": "string",
                    "description": "Order date/time (ISO-8601 preferred)",
                },
                "album_quantity": {
                    "type": "integer",
                    "description": "Total album or photocard product units purchased",
                },
                "total_amount": {
                    "type": "number",
                    "description": "Total payment amount in KRW (numbers only, no currency symbol)",
                },
            },
            "required": ["seller", "order_number", "album_quantity"],
            "additionalProperties": False,
        },
    },
}

GROUP_BUY_TRACKING_RESPONSE_FORMAT: dict[str, Any] = {
    "type": "json_schema",
    "json_schema": {
        "name": "group_buy_tracking_invoice",
        "schema": {
            "type": "object",
            "properties": {
                "invoice_rows": {
                    "type": "array",
                    "description": "Each shipping row from courier app capture",
                    "items": {
                        "type": "object",
                        "properties": {
                            "recipient_name": {
                                "type": "string",
                                "description": "Recipient name on the shipping label row",
                            },
                            "carrier": {
                                "type": "string",
                                "description": "Courier company (CJ, Lotte, etc.)",
                            },
                            "tracking_number": {
                                "type": "string",
                                "description": "Tracking / waybill number",
                            },
                            "address_hint": {
                                "type": "string",
                                "description": "Partial address if visible",
                            },
                        },
                        "required": ["recipient_name", "tracking_number"],
                        "additionalProperties": False,
                    },
                }
            },
            "required": ["invoice_rows"],
            "additionalProperties": False,
        },
    },
}


def build_receipt_response_format(
    *,
    declared_album_quantity: int | None = None,
    primary_seller: str | None = None,
    parse_markdown: str | None = None,
) -> dict[str, Any]:
    response_format = copy.deepcopy(GROUP_BUY_RECEIPT_RESPONSE_FORMAT)
    properties = response_format["json_schema"]["schema"]["properties"]

    if declared_album_quantity is not None:
        properties["album_quantity"]["description"] += (
            f" Expected group-buy album quantity: {declared_album_quantity}."
        )

    if primary_seller:
        properties["seller"]["description"] += (
            f" Expected seller/platform: {primary_seller}."
        )

    if parse_markdown:
        properties["order_number"]["description"] += (
            f" Document Parse context: {parse_markdown[:800]}"
        )

    return response_format


def build_tracking_response_format(*, parse_markdown: str | None = None) -> dict[str, Any]:
    response_format = copy.deepcopy(GROUP_BUY_TRACKING_RESPONSE_FORMAT)
    row_props = response_format["json_schema"]["schema"]["properties"]["invoice_rows"][
        "items"
    ]["properties"]

    row_props["recipient_name"]["description"] += (
        " Extract one row per recipient from the courier app capture."
    )
    row_props["tracking_number"]["description"] += (
        " Waybill / tracking number for each row."
    )

    if parse_markdown:
        row_props["recipient_name"]["description"] += (
            f" Document Parse context: {parse_markdown[:800]}"
        )

    return response_format
