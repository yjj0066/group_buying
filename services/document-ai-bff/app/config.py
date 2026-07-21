import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    upstage_api_key: str
    hybrid_shared_secret: str
    upstage_receipt_mode: str
    upstage_timeout_sec: int
    receipt_use_document_parse: bool
    port: int
    debug: bool


def get_settings() -> Settings:
    api_key = (os.getenv("UPSTAGE_API_KEY") or "").strip()
    secret = (os.getenv("HYBRID_SHARED_SECRET") or "").strip()
    mode = (os.getenv("UPSTAGE_RECEIPT_MODE") or "custom-schema").strip()

    timeout_raw = os.getenv("UPSTAGE_TIMEOUT_SEC", "90")
    try:
        timeout_sec = max(5, int(timeout_raw))
    except ValueError:
        timeout_sec = 90

    receipt_use_document_parse = os.getenv(
        "RECEIPT_USE_DOCUMENT_PARSE", "false"
    ).lower() in ("1", "true", "yes")

    port_raw = os.getenv("PORT", "5000")
    try:
        port = int(port_raw)
    except ValueError:
        port = 5000

    debug = os.getenv("FLASK_DEBUG", "false").lower() in ("1", "true", "yes")

    return Settings(
        upstage_api_key=api_key,
        hybrid_shared_secret=secret,
        upstage_receipt_mode=mode,
        upstage_timeout_sec=timeout_sec,
        receipt_use_document_parse=receipt_use_document_parse,
        port=port,
        debug=debug,
    )
