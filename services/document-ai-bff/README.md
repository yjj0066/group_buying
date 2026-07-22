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

## Render 배포

1. Render에서 **New Web Service** → 같은 GitHub repo 연결
2. **Root Directory:** `services/document-ai-bff`
3. **Runtime:** Docker (repo의 `Dockerfile` 사용)
4. **Environment:**
   - `UPSTAGE_API_KEY` — Upstage Console Secret Key
   - `HYBRID_SHARED_SECRET` — Medusa `HYBRID_API_SHARED_SECRET` 와 **동일한 값**
   - `UPSTAGE_RECEIPT_MODE=custom-schema`
   - `UPSTAGE_TIMEOUT_SEC=90`
5. 배포 URL 확인 (예: `https://document-ai-bff-xxxx.onrender.com`)
6. Medusa 백엔드(Render)에 설정:
   - `DOCUMENT_AI_ENABLED=true`
   - `HYBRID_API_URL=https://document-ai-bff-xxxx.onrender.com`
   - `HYBRID_API_SHARED_SECRET=<4번과 동일>`
   - `MEDUSA_BACKEND_URL=https://your-medusa.onrender.com`
7. Medusa 백엔드 **Manual Deploy** 후 총대 영수증 업로드 테스트

헬스체크: `GET https://document-ai-bff-xxxx.onrender.com/health` → `"upstage_configured": true`
