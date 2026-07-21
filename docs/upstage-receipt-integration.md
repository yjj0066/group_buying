# Upstage 영수증 자동 추출 연동 가이드

총대 **1차 구매 · 영수증(PURC-02~03)** 흐름에서 Upstage API로 구매 증빙을 구조화하는 방법입니다.

## 아키텍처 (OCR는 브라우저에서 직접 호출 금지)

```
[Storefront]  AiVerificationPanel
      │  server action: parseGroupDealReceiptDocument()
      ▼
[Medusa Backend]  POST /store/me/group-deals/:id/receipt/parse
      │  processGroupDealReceiptParse() → group-deal-document-ai.ts
      ▼
[Document AI BFF]  POST /api/v1/document-ai/receipts/parse   ← Flask (이 레포 services/)
      │  Upstage Information Extract (+ 선택: Document Parse)
      ▼
[Upstage API]  POST https://api.upstage.ai/v1/information-extraction
```

Medusa는 이미 Flask BFF 클라이언트(`flask-document-ai-client.ts`)와 필드 매퍼(`mapFlaskExtractToStructuredReceipt`)를 갖추고 있습니다.  
**Upstage 키는 BFF에만** 두고, `DOCUMENT_AI_ENABLED=true`로 stub 대신 BFF를 켜면 됩니다.

---

## 1. Upstage 준비

1. [Upstage Console](https://console.upstage.ai) 가입
2. **API Keys** 메뉴에서 Secret Key 발급
3. 사용 API (v3 스펙 DOCS-01~02):
   - **Information Extract** — 필드 JSON 추출 (필수)
   - **Document Parse** — 표·레이아웃 복원 (선택, 다건 송장·복잡 캡처용)

### 영수증 유형별 모델 선택

| 유형 | 권장 |
|------|------|
| 종이 영수증 | Prebuilt `receipt-extraction` |
| Weverse / 앱 주문내역 스크린샷 | **커스텀 스키마 IE** (본 BFF 기본값) |

공동구매는 모바일 **주문내역 캡처**가 많아 BFF는 커스텀 스키마를 기본으로 합니다.

---

## 2. Document AI BFF 실행

```bash
cd services/document-ai-bff
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env

# .env 에 UPSTAGE_API_KEY, HYBRID_SHARED_SECRET 설정
python -m app.main
# → http://localhost:5000
```

헬스체크: `GET http://localhost:5000/health`

---

## 3. Medusa 백엔드 환경 변수

`apps/backend/.env` (로컬):

```env
# Document AI BFF
DOCUMENT_AI_ENABLED=true
HYBRID_API_URL=http://localhost:5000
HYBRID_API_SHARED_SECRET=dev-shared-secret-change-me

# BFF가 저장한 영수증 URL을 Upstage가 fetch할 수 있게 공개 URL 필요
MEDUSA_BACKEND_URL=http://localhost:9000

# 선택
DOCUMENT_AI_AUTO_VERIFY_CONFIDENCE=0.85
DOCUMENT_AI_REQUEST_TIMEOUT_MS=60000
```

프로덕션은 `apps/backend/.env.document-ai.template` 참고.

**주의**

- 개발 모드에서 `DOCUMENT_AI_ENABLED`를 명시하지 않으면 **stub**만 사용합니다 (`hybrid-api-config.ts`).
- `MEDUSA_BACKEND_URL`이 없으면 BFF는 `input_base64`만 사용합니다 (권장).

---

## 4. Medusa → BFF 요청 계약

Medusa가 보내는 body (`flask-document-ai-client.ts`):

| 필드 | 설명 |
|------|------|
| `partner_source` | `"medusa_group_buying"` |
| `partner_group_deal_id` | 공구 ID |
| `input_base64` | `data:image/...;base64,...` |
| `input_url` | `/static/receipts/...` (선택) |
| `input_file_name` | 원본 파일명 |
| `input_payload_json.declared_album_quantity` | CRTE-03 선언 수량 |
| `input_payload_json.primary_seller` | CRTE-01 1차 판매처 |

헤더: `X-Hybrid-Shared-Secret: <HYBRID_API_SHARED_SECRET>`

---

## 5. BFF → Medusa 응답 계약

BFF는 아래 형태로 `job`을 반환해야 Medusa가 그대로 매핑합니다.

```json
{
  "job": {
    "id": "receipt-<dealId>-<timestamp>",
    "job_type": "receipt_parse",
    "status": "completed",
    "confidence": 0.91,
    "needs_review": false,
    "extract_result_json": {
      "receipt_fields": {
        "seller": "Weverse Shop",
        "order_number": "WVS-20260721-1234",
        "ordered_at": "2026-07-21T14:30:00+09:00",
        "album_quantity": 12,
        "total_amount": 456000,
        "confidence": 0.91
      }
    }
  }
}
```

Medusa 매핑 (`mapFlaskExtractToStructuredReceipt`):

| `receipt_fields` | 대체 키 (Upstage raw) |
|------------------|------------------------|
| `seller` | `store_name`, `merchant_name` |
| `order_number` | `order_id`, `order_no` |
| `ordered_at` | `order_date`, `purchased_at` |
| `album_quantity` | `quantity`, `item_quantity` |
| `total_amount` | `amount`, `total_price` |

---

## 6. 자동 검증 · 확인 큐 (DOCS-04)

`processGroupDealReceiptParse()` 흐름:

1. `confidence >= DOCUMENT_AI_AUTO_VERIFY_CONFIDENCE` (기본 0.85) → `parsed`
2. 그 미만 또는 `needs_review: true` → `needs_review` → UI **「영수증 분석 결과 확인」**
3. `validatePurchaseReceiptStub()`:
   - 주문번호 없음 → 실패
   - `primary_seller` vs 추출 `seller` 불일치 → 실패
   - 추출 수량 < 선언 수량 → 실패
4. 검증 통과 + `parsed` → `purchase_receipt_status=verified`

---

## 7. 로컬 테스트 순서

1. Medusa + Postgres 실행 (`pnpm backend:dev`)
2. Document AI BFF 실행 (`python -m app.main`)
3. `apps/backend/.env`에 Document AI 변수 설정 후 **백엔드 재시작**
4. 총대 로그인 → **1차 구매 증빙** → JPG/PNG 업로드
5. Medusa 로그 / BFF 로그에서 Upstage 호출 확인
6. UI에서 추출 필드(판매처·주문번호·수량·금액) 표시 확인

curl (BFF 단독):

```bash
curl -X POST http://localhost:5000/api/v1/document-ai/receipts/parse \
  -H "Content-Type: application/json" \
  -H "X-Hybrid-Shared-Secret: dev-shared-secret-change-me" \
  -d "{\"partner_source\":\"medusa_group_buying\",\"partner_group_deal_id\":\"test-deal\",\"input_base64\":\"data:image/png;base64,...\"}"
```

---

## 8. 프로덕션 체크리스트

- [ ] BFF를 Railway/Render 등에 배포, HTTPS URL을 `HYBRID_API_URL`에 설정
- [ ] `HYBRID_API_SHARED_SECRET` Medusa ↔ BFF 동일 값
- [ ] `MEDUSA_BACKEND_URL` = 공개 Medusa URL (`/static/receipts` 접근 가능)
- [ ] Upstage API Key는 BFF 환경 변수만 (Vercel/Medusa에 넣지 않음)
- [ ] 업로드 한도: Medusa 20MB / Upstage Prebuilt IE 50MB
- [ ] Upstage Rate limit: Prebuilt IE 약 1 RPS — 동시 업로드 제한 고려

---

## 9. 관련 코드

| 역할 | 경로 |
|------|------|
| Medusa parse 진입 | `apps/backend/src/utils/group-deal-document-ai.ts` |
| Flask 클라이언트 | `apps/backend/src/utils/flask-document-ai-client.ts` |
| Feature flag | `apps/backend/src/utils/hybrid-api-config.ts` |
| 구조화 타입·검증 | `apps/backend/src/utils/document-extract-stub.ts` |
| Storefront UI | `apps/storefront/.../ai-verification-panel/` |
| BFF 구현 | `services/document-ai-bff/` |

---

## 10. 송장(배송) 추출

동일 BFF에 `POST /api/v1/document-ai/tracking/parse` 를 추가하면 SHIP-02~03도 연동할 수 있습니다.  
Upstage prebuilt `air-waybill-extraction` 또는 커스텀 스키마(수령인·택배사·운송장)를 사용합니다.
