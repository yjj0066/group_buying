# Document AI BFF (Upstage)

Medusa group-buying의 영수증/송장 AI 파이프라인용 Flask BFF입니다.

## Quick start

```bash
cd services/document-ai-bff
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env          # UPSTAGE_API_KEY 설정
python -m app.main
```

### Upstage 단독 테스트 (총대/Medusa 없이)

Upstage 문서와 동일한 **Information Extract + OpenAI SDK** 방식입니다.

```bash
pip install -r requirements.txt
python scripts/test_receipt_extract.py C:\path\to\receipt.png
```

`.env`:
- `UPSTAGE_RECEIPT_MODE=custom-schema` → `model=information-extract` + JSON schema (앱 주문 캡처 권장)
- `UPSTAGE_RECEIPT_MODE=receipt-extraction` → Upstage prebuilt 종이 영수증 모델

상세 가이드: [docs/upstage-receipt-integration.md](../../docs/upstage-receipt-integration.md)

## Endpoints

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 |
| POST | `/api/v1/document-ai/receipts/parse` | 영수증: **Parse → Extract** |
| POST | `/api/v1/document-ai/tracking/parse` | 송장: **Parse → Extract** (다건 rows) |
| GET | `/api/v1/document-ai/jobs/:id` | Job 조회 (stub) |

## Env

| 변수 | 설명 |
|------|------|
| `UPSTAGE_API_KEY` | Upstage Console API Key |
| `HYBRID_SHARED_SECRET` | Medusa `HYBRID_API_SHARED_SECRET` 와 동일 |
| `UPSTAGE_RECEIPT_MODE` | `custom-schema` (앱 주문 캡처) 또는 `receipt-extraction` (종이 영수증) |
