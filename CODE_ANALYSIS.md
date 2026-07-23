# PokaCatch (포카캐치) — Code Analysis

> **작성 기준일:** 2026-07-23 (최초 2026-07-15, 2026-07-18·2026-07-20·2026-07-21 갱신)  
> **대상:** `group-buying-site/` monorepo (`@dtc/backend` + `@dtc/storefront` + `document-ai-bff`)  
> **관련 문서:** [README.md](./README.md) · [PROJECT_STATUS.md](./PROJECT_STATUS.md) · [docs/MODULES.md](./docs/MODULES.md)

---

## 1. Executive Summary

본 프로젝트는 **Medusa v2 커스텀 모듈** 위에 공동구매 도메인을 올리고, **Next.js App Router** 스토어프론트와 **Flask Document AI BFF**(Upstage)를 분리 연동한 3-tier 구조이다. 서비스 브랜드명은 **PokaCatch (포카캐치)** 이다.

| 레이어 | 역할 | Source of Truth |
|--------|------|-----------------|
| **Medusa Backend** | 주문·결제·재고·공구 CRUD·워크플로·정산·Document AI 게이트·신뢰 집계 | PostgreSQL |
| **Next.js Storefront** | UI·i18n·BFF·Server Actions (`{ ok, data \| error }`) | Medusa Store API |
| **Document AI BFF** | 영수증·송장 OCR (Upstage) — **API 키는 BFF에만** | Flask + Upstage API |

**핵심 설계 원칙:**

1. **결제/주문은 Medusa만** — Document AI BFF는 commerce path에 끼지 않음
2. **실패 격리** — AI/로그 실패가 장바구니·결제 UX를 차단하지 않음 (Server Action은 throw 대신 `{ ok: false, error }` 반환)
3. **직렬화 계층 분리** — DB 모델 → `group-deal-store.ts` / `group-deal-account.ts` → Storefront types
4. **v3 이중 결제** — PG 에스크로 경로와 가상계좌(VA) 경로가 join/apply route에서 분기
5. **Pure function 집계** — 신뢰·단가 추천·송장 매칭은 DB 컬럼 없이 metadata + utils에서 계산
6. **KRW 전용** — 통화 선택 UI 제거, 모든 가격·결제는 원화 기준
7. **영수증 검증 게이트** — `purchase_receipt_status === verified` 전에는 송장 파싱·발송 확정 차단 (Admin Verify 또는 PURC 자동/수동 검증)

### 2026-07-23 주요 변경

| 영역 | 구현 | 핵심 파일 |
|------|------|-----------|
| **브랜드명** | BiasBuy → **PokaCatch (포카캐치)** | `dictionaries/ko.ts`, `landing-shared.ts`, `gbApp.auth.logo` |
| **영수증 수동 입력 (PURC)** | AI 실패 시 5필드 직접 입력 | `receipt-structured-entry-form/`, `ai-verification-panel/` |
| **영수증 추출값 수정** | 파싱 후 **수정** 토글 → confirm 저장 | `seller-purchase-view/`, `receipt/confirm/route.ts` |
| **`receipt/confirm` API** | `processGroupDealReceiptConfirm()` — 수동 structured + 재검증 | `group-deal-document-ai.ts`, `validators.ts` |
| **parse 실패 URL 보존** | AI catch에서 `purchase_receipt_url` 저장 | `processGroupDealReceiptParse()` catch block |
| **문서** | Upstage·BFF·PURC/SHIP 아키텍처 | `docs/MODULES.md` |

### 2026-07-21 주요 변경

| 영역 | 구현 | 핵심 파일 |
|------|------|-----------|
| **Document AI · 영수증 (PURC)** | BFF/Upstage 파싱, Admin 검증 게이트 | `receipt/parse/route.ts`, `group-deal-document-ai.ts` |
| **Document AI · 송장 (SHIP)** | 송장 OCR → 참여자 매칭 테이블 자동 채움 | `tracking/parse/route.ts`, `leader-tracking-match.ts`, `leader-shipping-prep-view/` |
| **매칭 사유 컬럼** | `확인 필요` 행에 미매칭·택배사 누락 등 사유 표시 | `ShippingMatchReviewReason`, `matchReviewReasons` i18n |
| **발송 확정** | workflow 대신 `processGroupDealShippingComplete()` 직접 호출 | `group-deal-leader-ops.ts`, `shipping/complete/route.ts` |
| **오류 처리** | Server Action `{ ok, error }` + `resolveMedusaErrorMessage()` duck-typing | `medusa-error.ts`, `route-error.ts`, `leader-shipping.ts` |
| **정산 계좌** | 가입 계좌 불러오기, 전체 계좌번호 metadata 저장 | `bank-account/route.ts`, `bank-account-form.tsx`, `getBankAccount()` |
| **내 공구 관리** | 정산 완료 → **종료** 표시, 리포트 링크 | `seller-deal-metrics.ts`, `hosted-deals-list/` |

### 2026-07-20 주요 변경

| 영역 | 구현 | 핵심 파일 |
|------|------|-----------|
| **상단 검색 → 공동구매** | 헤더 돋보기가 `/store?q=` 대신 `/group-buying?q=` 로 이동 | `product-search/`, `buildGroupBuyingSearchPath()` |
| **통화 선택 제거** | EUR/USD/KRW 선택 UI 삭제, KRW-only 정책 | `nav/index.tsx` |
| **SRCH 필터** | 아이돌 그룹(검색형), 굿즈 종류, 가격 범위(슬라이더+입력) | `search-filter-bar/`, `group-buying-filter-match.ts` |
| **참여 apply API** | `POST /store/group-deals/:id/apply` (인증) | `apply/route.ts`, `group-deal-participation.ts` |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Browser (6 locales, KRW-only UI, brand: 포카캐치)         │
└─────────────────────────────────────────────────────────────────────────────┘
         │                              │                         │
         ▼                              ▼                         ▼
┌─────────────────┐          ┌──────────────────┐      ┌─────────────────┐
│  Next.js RSC    │          │  Next.js Client  │      │  Medusa Admin   │
│  Server Actions │          │  GB App islands  │      │  Verify Receipt │
│  { ok, data }   │          │  PURC/SHIP/STLM  │      │  Group Deals    │
└────────┬────────┘          └────────┬─────────┘      └────────┬────────┘
         │                            │                          │
         │  sdk.client.fetch          │                          │
         ▼                            ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Medusa Backend (:9000 / Render)                           │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────┐  ┌───────────────────┐  │
│  │ group-buying │  │ workflows   │  │ subscribers│  │ PG modules        │  │
│  │ module       │  │ escrow/bill │  │ + cron     │  │ toss/stripe       │  │
│  └──────────────┘  └─────────────┘  └────────────┘  └───────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ utils: store · account · leader-ops · document-ai · route-error       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ api/store/me/group-deals: receipt/parse · receipt/confirm ·           │  │
│  │   tracking/parse · shipping/complete · settlement · bank-account    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
         │ DOCUMENT_AI_ENABLED=true                    │
         ▼                                             │
┌─────────────────────────────────────────────────────┴───────────────────┐
│  Document AI BFF (:5000 / Render) — Upstage OCR only here                  │
│  Flask — receipt/tracking parse jobs                                         │
│  HYBRID_API_URL + HYBRID_API_SHARED_SECRET                                   │
└───────────────────────────────────────────────────────────────────────────┘
```

**프로덕션:** Vercel (storefront) + Render (Medusa + BFF). 상세는 [docs/MODULES.md](./docs/MODULES.md).

### 2.1 Route Groups (Storefront)

| Group | 경로 | 렌더링 |
|-------|------|--------|
| `(landing)` | `/kr` | RSC + 역할 redirect + AI slider |
| **`(gb-app)`** | **`/home`, `/deals/*`, `/seller/*`, `/my/*`, `/auth/*`** | **RSC gate + client islands + tab bar** |
| `(main)` | `/group-buying`, `/store`, `/account`, `/products` | RSC + client islands |
| `(checkout)` | `/cart`, `/checkout` | client-heavy PG widgets |
| `app/api/ai` | BFF | Route Handlers (no UI) |

**총대 GB App 라우트:**

| 화면 ID | 경로 | 컴포넌트 |
|---------|------|----------|
| PURC | `/seller/deals/{id}/purchase-proof` | `seller-purchase-view/` → `ai-verification-panel/` + `receipt-structured-entry-form/` |
| PURC-F | (실패 안내) | `seller-purchase-failed-view/` — 수동 입력 안내 |
| SHIP | `/seller/deals/{id}/shipping` | `leader-shipping-prep-view/` |
| STLM | `/seller/deals/{id}/settlement` | `leader-settlement-view/` |
| RPTG | `/seller/deals/{id}/report` | `seller-leader-report-view/` |
| MYHD | `/my/hosted` | `hosted-deals-list/` |

**GB App vs 레거시 `(main)`:**

- **목록/검색:** `/kr/group-buying` (메인 SRCH) ↔ `/kr/home`, `/kr/search` (GB App)
- **상세/입금:** `/kr/group-buying/[id]` ↔ `/kr/deals/[dealId]`
- **마이:** `/kr/account/*` ↔ `/kr/my/*`

### 2.2 Dev / Prod Process Layout

| 프로세스 | 로컬 | 프로덕션 |
|----------|------|----------|
| Next.js storefront | `:8000` | Vercel |
| Medusa backend | `:9000` | Render |
| Document AI BFF | `:5000` | Render (Upstage) |

루트 `pnpm dev`는 백엔드 + 스토어프론트만 기동. Document AI 사용 시 BFF를 별도 실행한다.

### 2.3 Dev Performance Defaults

| 설정 | 파일 | dev 기본 |
|------|------|----------|
| Document AI | `hybrid-api-config.ts` | **OFF** (`DOCUMENT_AI_ENABLED=false`) |
| Flask product search | `lib/config/flask-search.ts` | **OFF** |
| Server Actions body limit | `next.config.js` | **32mb** (송장/영수증 업로드) |
| GB App search debounce | `use-debounced-value.ts` | **200ms** |

---

## 3. Backend Code Analysis

### 3.1 Module Pattern — `GroupBuyingModuleService`

**위치:** `apps/backend/src/modules/group-buying/service.ts`

Medusa v2 `MedusaService({ Model... })` 패턴. 5개 엔티티를 단일 서비스로 관리한다.

**책임 분리:**

| 계층 | 파일 | 역할 |
|------|------|------|
| Service | `service.ts` | CRUD, join slot, waitlist, tracking bulk update, delivery confirm |
| Rules | `utils/group-deal-rules.ts` | joinable 검증, status evaluation |
| Store serialize | `utils/group-deal-store.ts` | Store API DTO, timeline stage |
| Account serialize | `utils/group-deal-account.ts` | My page DTO, participation stage |
| Leader ops | `utils/group-deal-leader-ops.ts` | 영수증 게이트, 발송 확정, 문서 저장 |
| Document AI | `utils/group-deal-document-ai.ts` | OCR 파싱, 수동 confirm, 참여자 매칭 |
| Leader trust | `utils/leader-trust-profile.ts` | MTRS 집계 |
| Route errors | `utils/route-error.ts` | MedusaError/Zod → HTTP 응답 |
| Receipt validation | `utils/document-extract-stub.ts` | `validatePurchaseReceiptStub()` — 4항목 검증 |

### 3.2 Leader Operations — `group-deal-leader-ops.ts`

| 함수 | 역할 |
|------|------|
| `saveGroupDealDocumentImage()` | base64 data URL → `static/receipts` 또는 `static/tracking` (또는 R2) |
| `assertPurchaseReceiptVerified()` | `purchase_receipt_status === verified` 아니면 NOT_ALLOWED |
| `assertAllParticipantsPaid()` | 활성 참여자 입금 확인 |
| `processGroupDealShippingComplete()` | **발송 확정** — 운송장 bulk update + 알림 emit |
| `markGroupDealShippingCompletedIfReady()` | 전원 tracking 등록 시 deal status 전환 |

발송 확정은 workflow step 대신 route에서 **직접 호출**한다.

### 3.3 Document AI — `group-deal-document-ai.ts`

| 함수 | 역할 |
|------|------|
| `assertGroupDealLeader()` | leader_customer_id 검증 |
| `processGroupDealReceiptParse()` | 영수증 OCR → structured_receipt, validation, image 저장 |
| **`processGroupDealReceiptConfirm()`** | **수동/수정 structured 저장 → 재검증 → status 갱신** |
| `processGroupDealTrackingParse()` | 송장 OCR → invoice_rows, auto match |
| `matchParticipantsToInvoiceRows()` | 백엔드 참여자 이름·주소 매칭 |
| `buildDocumentAiResultPayload()` | job + validation + source (`flask` \| `stub` \| **`manual`**) |
| `mapFlaskJobToDocumentAiStatus()` | BFF job status → `parsed` / `needs_review` / `failed` |

**영수증 파이프라인 (parse):**

```
Client (base64 upload)
  → POST .../receipt/parse
  → saveGroupDealDocumentImage (static/ or R2)
  → DOCUMENT_AI_ENABLED ?
       true  → flask-document-ai-client → BFF → Upstage IE + Document Parse
       false → document-extract-stub
  → validatePurchaseReceiptStub (4항목)
  → updatePurchaseReceipt + receipt_ai_* + metadata.purchase_receipt_structured
  → on BFF error: catch saves receipt_url (UPLOADED) for manual confirm
```

**영수증 confirm 파이프라인 (2026-07-23):**

```
Client (manual form submit)
  → POST .../receipt/confirm
  → assertGroupDealLeader + require purchase_receipt_url
  → build StructuredReceiptFields (confidence: 1, source: manual)
  → validatePurchaseReceiptStub
  → purchase_receipt_status: verified | uploaded
  → receipt_ai_status: parsed | needs_review
  → metadata.purchase_receipt_structured
  → same GroupDealDocumentParseResult shape as parse
```

**`validatePurchaseReceiptStub` (4항목):**

| reason | 조건 |
|--------|------|
| `ORDER_NUMBER_MISSING` | `order_number` 없음 |
| `SELLER_MISMATCH` | `primary_seller` vs `structured.seller` 불일치 |
| `ORDER_BEFORE_ALL_PAID` | `ordered_at` ≤ all_participants_paid_at |
| `ALBUM_QUANTITY_INSUFFICIENT` | `album_quantity` < declared |

### 3.4 API Routes — 총대 · Document AI

| Method | 경로 | Handler | try/catch |
|--------|------|---------|-----------|
| POST | `/store/me/group-deals/:id/receipt/parse` | `processGroupDealReceiptParse` | route-local |
| POST | `/store/me/group-deals/:id/receipt/confirm` | `processGroupDealReceiptConfirm` | route-local |
| POST | `/store/me/group-deals/:id/tracking/parse` | `processGroupDealTrackingParse` | route-local |
| POST | `/store/me/group-deals/:id/shipping/complete` | `processGroupDealShippingComplete` | `respondWithRouteError` |
| POST | `/store/me/group-deals/:id/settlement` | settlement submit | 기존 |
| GET/POST | `/store/me/bank-account` | customer.metadata.refund_bank_account | 기존 |

**`PostStoreMeGroupDealReceiptConfirm` (Zod):**

```typescript
{
  order_number: string (required)
  seller?: string | null
  ordered_at?: string | null
  album_quantity: number (int, positive)
  total_amount?: number | null
}
```

**공통 route 오류 처리 (`route-error.ts`):**

`shipping/complete`는 `respondWithRouteError` 사용. `receipt/parse`, `receipt/confirm`, `tracking/parse`는 route-local duplicate — 통합 후보.

### 3.5 Bank Account — `bank-account/route.ts`

`customer.metadata.refund_bank_account`에 **전체 `account_number`** 와 `account_number_masked`를 함께 저장한다. 레거시 마스킹-only 계좌는 STLM에서 재저장 안내.

### 3.6 Apply / Join / Deposit (참여 flow)

**Apply:** `POST /store/group-deals/:id/apply` → VA 발급 + 5min `payment_deadline`  
**Deposit confirm:** `deposit-confirm/route.ts` — customer owns participant 검증 (CHKO-02 webhook은 stub)

### 3.7 State Machine — `GroupDealStatus`

```typescript
export enum GroupDealStatus {
  DRAFT = "draft",
  OPEN = "open",
  MINIMUM_REACHED = "minimum_reached",
  CLOSED = "closed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  SETTLED = "settled",
}
```

총대 UI stage는 `metadata.leader_stage` + deal status 조합으로 `seller-deal-metrics.ts`에서 해석한다.

### 3.8 Workflows & Cron

| 파일 | 역할 |
|------|------|
| `workflows/group-deal-escrow.ts` | 에스크로·waitlist·미결제 만료 |
| `workflows/group-deal-billing.ts` | 결제·이벤트 emit |
| `jobs/group-deal-maintenance.ts` | Cron — 미결제 만료, D+7 자동 수령 확인 |

발송 확정·영수증 confirm은 **workflow 밖** utils 직접 호출.

---

## 4. Storefront Code Analysis

### 4.1 Server Actions Pattern

**원칙:** mutation Server Action은 **throw하지 않고** discriminated union을 반환한다.

| 파일 | Actions |
|------|---------|
| `lib/data/group-deal-document-ai.ts` | `parseGroupDealReceiptDocument()`, `parseGroupDealTrackingDocument()`, **`confirmGroupDealReceiptStructured()`** |
| `lib/data/leader-shipping.ts` | `confirmLeaderShipping()` |
| `lib/data/leader-settlement.ts` | `submitLeaderSettlementRequest()` |
| `lib/data/group-deal-participation.ts` | `submitDealApplication()`, `confirmVirtualAccountDeposit()` |

### 4.2 Error Message Resolution — `medusa-error.ts`

`resolveMedusaErrorMessage(error: unknown): string` — FetchError duck-typing, `Document AI BFF is required`, 영수증 게이트 한국어 메시지 유지.

Vitest: `lib/util/__tests__/medusa-error.spec.ts`

### 4.3 Document AI UI — PURC (2026-07-23)

| 컴포넌트 | 역할 |
|----------|------|
| `seller-purchase-view/` | PURC 셸 — proceed/failed 라우팅, `AiVerificationPanel` 호스트 |
| `ai-verification-panel/` | 업로드, AI 결과 read-only, **수정 토글**, 실패 시 수동 폼 노출 |
| **`receipt-structured-entry-form/`** | **5필드 편집 폼** — seller, order_number, ordered_at, album_quantity, total_amount |
| `seller-purchase-failed-view/` | PURC-F — i18n, purchase-proof 복귀 안내 |
| `group-deal-document-ai-presenter.ts` | `buildReceiptExtractFields`, `buildReceiptVerificationItems`, **`buildReceiptStructuredDraft`** |

**PURC UX 상태 머신 (client):**

```
upload → parse OK → read-only + [수정] toggle
       → parse fail / needs_review → manual form auto-show
       → confirm OK → validation checklist refresh → proceed enabled
```

**레거시 (미사용):** `leader-purchase-proof/leader-purchase-proof-form.tsx` — sessionStorage draft, API 미연동

### 4.4 Document AI UI — SHIP

| 컴포넌트 | 역할 |
|----------|------|
| `leader-shipping-prep-view/` | 송장 업로드, 매칭 테이블, 수동 tracking/carrier, 발송 확정 |
| `leader-tracking-match.ts` | merge, match score, `ShippingMatchReviewReason`, manual patch |

### 4.5 Settlement · Hosted Deals

`leader-settlement-view/`, `bank-account-form.tsx`, `hosted-deals-list/`, `seller-deal-metrics.ts` — 2026-07-21 구현 유지.

### 4.6 Data Layer

| 파일 | 패턴 |
|------|------|
| `lib/data/group-deal-document-ai.ts` | parse + **confirm** actions |
| `lib/data/leader-shipping.ts` | `confirmLeaderShipping()` |
| `lib/data/account-group-deals.ts` | hosted, participations, `getBankAccount()` |
| `lib/data/group-deals.ts` | Medusa SDK → `/store/group-deals/*` |

### 4.7 GB App Route Registry — `wireframe/routes.ts`

`gbAppRoutes.sellerPurchaseProof`, `sellerPurchaseFailed`, `sellerOpening`, `sellerShipping`, `sellerSettlement`, `sellerDealReport`, `myHosted` 등.

### 4.8 i18n · Branding (2026-07-23)

6개 로케일. 브랜드 키:

| 키 | ko | en |
|----|----|----|
| `nav.storeName` | 포카캐치 | PokaCatch |
| `landing.brandName` | 포카캐치 | PokaCatch |
| `gbApp.auth.logo` | 포카캐치 | PokaCatch |

PURC 수동 입력: `manualEntryTitle`, `editExtractedButton`, `saveManualEntryButton`, `leaderPurchaseFailed.*`

**참고:** VA 예금주 `(주)아이돌공구`는 법인명 — UI 브랜드와 분리.

---

## 5. Document AI BFF Pipeline

**위치:** `services/document-ai-bff/` — **Upstage API를 직접 호출하는 유일한 레이어**

```
Storefront Server Action (base64)
    ↓
Medusa POST .../receipt|tracking/parse  OR  .../receipt/confirm (no BFF)
    ↓
group-deal-document-ai.ts
    ├── saveGroupDealDocumentImage → static/ | R2
    ├── parse path → flask-document-ai-client → BFF → Upstage
    └── confirm path → validatePurchaseReceiptStub (local, no OCR)
    ↓
Response: { group_deal, document_ai: { structured_receipt, validation, ... } }
```

| Env (backend) | 역할 |
|---------------|------|
| `DOCUMENT_AI_ENABLED` | `true` → BFF 호출, `false` → stub |
| `HYBRID_API_URL` | BFF base URL |
| `HYBRID_API_SHARED_SECRET` | BFF ↔ Medusa shared secret |
| `MEDUSA_BACKEND_URL` | BFF가 input_url fetch 시 public static URL 빌드 |

| Env (BFF) | 역할 |
|-----------|------|
| `UPSTAGE_API_KEY` | Upstage OCR |
| `HYBRID_SHARED_SECRET` | Medusa 인증 |

상세 다이어그램: [docs/MODULES.md](./docs/MODULES.md)

---

## 6. Data Flows

### 6.1 참여자 Flow (APLY → CHKO → MYJN)

```
deal-apply-form → submitDealApplication → VA + payment_deadline (5min)
deal-deposit-flow → confirmVirtualAccountDeposit → listMyParticipations
```

### 6.2 총대 Flow — PURC (2026-07-23)

```
purchase-proof 업로드
  → receipt/parse (AI)
  ├── success → read-only fields + optional [수정]
  └── fail    → manual form (receipt URL saved in catch)
  → receipt/confirm (manual or corrected fields)
  → validatePurchaseReceiptStub → verified | needs_review
  → proceed to opening (verified or user reviewed)
  → (optional) Admin Verify Receipt
```

### 6.3 총대 Flow — SHIP → STLM → RPTG

```
tracking/parse → 매칭 테이블 → 수동 보정
  → POST .../shipping/complete (assertPurchaseReceiptVerified)
  → STLM: settlement + bank-account
  → RPTG → MYHD 「종료」
```

### 6.4 Payment Dual Path

```
POST /join or POST /apply
    ├── virtual_account → /deposit (5min hold) → deposit-confirm
    └── cart_id (legacy) → /checkout (PG)
```

---

## 7. Cross-Cutting Concerns

### 7.1 Authentication

| Context | Mechanism |
|---------|-----------|
| Store customer | Medusa session cookie → `getAuthHeaders()` |
| `/store/me/*` | `AuthenticatedMedusaRequest` + middlewares |
| Leader Document AI | `assertGroupDealLeader()` |
| Admin Verify Receipt | Medusa Admin JWT |

### 7.2 Error Handling Stack

```
Backend route → try/catch → JSON { message, type }
Server Action → catch → resolveMedusaErrorMessage → { ok: false, error }
Client → if (!result.ok) setSubmitError(result.error)
```

---

## 8. Key Algorithms

### 8.1 Receipt Validation — `validatePurchaseReceiptStub`

Pure function in `document-extract-stub.ts`. parse와 confirm 모두 동일 함수 사용 — **single source of truth**.

### 8.2 Tracking Match (Frontend + Backend)

`leader-tracking-match.ts` (score, disambiguation) + `resolveInvoiceRowParticipantMatches` (backend). confidence ≥ 0.85.

### 8.3 Leader Trust Score (MTRS)

`trustScore = averageRating + completedBonus + onTimeBonus - disputePenalty - forfeiturePenalty`

### 8.4 Hosted Deal Settlement Complete

`isHostedDealSettlementComplete(deal)` — `settlement_submitted_at` / `leader_stage === settled` / `report_stage`

---

## 9. File / Directory Map

```
group-buying-site/
├── README.md
├── PROJECT_STATUS.md
├── CODE_ANALYSIS.md
├── docs/
│   ├── MODULES.md                              # 2026-07-23 Upstage architecture
│   ├── api-contract-for-merge.md
│   └── upstage-receipt-integration.md
├── apps/
│   ├── backend/
│   │   └── src/
│   │       ├── api/store/me/group-deals/[id]/
│   │       │   ├── receipt/
│   │       │   │   ├── parse/route.ts
│   │       │   │   └── confirm/route.ts        # 2026-07-23
│   │       │   ├── tracking/parse/route.ts
│   │       │   ├── shipping/complete/route.ts
│   │       │   └── settlement/route.ts
│   │       └── utils/
│   │           ├── group-deal-document-ai.ts   # parse + confirm
│   │           ├── document-extract-stub.ts    # validatePurchaseReceiptStub
│   │           ├── group-deal-leader-ops.ts
│   │           ├── flask-document-ai-client.ts
│   │           └── purchase-receipt-guard-message.ts
│   └── storefront/
│       └── src/
│           ├── i18n/dictionaries/              # brand: 포카캐치 / PokaCatch
│           ├── lib/data/group-deal-document-ai.ts
│           ├── lib/util/group-deal-document-ai-presenter.ts
│           └── modules/group-buying/components/
│               ├── ai-verification-panel/
│               ├── receipt-structured-entry-form/  # 2026-07-23
│               ├── seller-purchase-view/
│               ├── seller-purchase-failed-view/
│               └── leader-shipping-prep-view/
└── services/document-ai-bff/
    └── app/                                    # Upstage only entry point
```

---

## 10. Code Quality Assessment

### 10.1 Strengths

| 항목 | 설명 |
|------|------|
| **Domain separation** | rules/utils pure functions + unit tests |
| **Failure isolation** | AI 실패 → manual confirm fallback, commerce path 분리 |
| **Validation SSoT** | `validatePurchaseReceiptStub` — parse/confirm 공유 |
| **Document AI pipeline** | BFF-only Upstage keys, stub fallback |
| **Error UX** | `{ ok, error }` + actionable 한국어 |
| **Tracking match tests** | Vitest specs |

### 10.2 Technical Debt

| 항목 | 심각도 | 설명 |
|------|--------|------|
| Route error handler split | Low | `receipt/parse`, `confirm`, `tracking/parse` — `route-error.ts` 미적용 |
| VA webhook (CHKO-02) | Medium | deposit-confirm stub |
| Dual route trees | Medium | `(main)/group-buying` + `(gb-app)/deals` |
| `/kr/home` server error | Medium | digest `894050647` — auth state dependent |
| Client-side SRCH filter | Medium | No server pagination |
| Legacy `leader-purchase-proof-form` | Low | sessionStorage wireframe — dead code candidate |
| Bank account metadata | Medium | full account_number — encryption policy TBD |

### 10.3 Test Coverage

| Area | Coverage |
|------|----------|
| Backend utils | 9+ spec files |
| `medusa-error.ts`, `leader-tracking-match.ts` | Vitest |
| `receipt/confirm` | manual E2E recommended |
| Full PURC→SHIP→STLM | integration test gap |

---

## 11. Security Notes

| Topic | Status |
|-------|--------|
| `/store/me/*` | Middleware auth — OK |
| Leader Document AI | `assertGroupDealLeader()` — OK |
| Receipt gate | verified before SHIP — OK |
| OCR API keys | BFF server-side only — OK |
| Manual confirm | leader-only, requires prior receipt image URL — OK |
| Bank account | full number in metadata — scope OK, encryption TBD |
| Static documents | R2/local — access control 검토 |

---

## 12. Extension Guide

### 12.1 Wire Real Bank VA Webhook (CHKO-02)

Adapter in `utils/virtual-account.ts` + webhook route.

### 12.2 Extend Receipt Manual Entry

1. Add field-level client validation mirroring `validatePurchaseReceiptStub`
2. Optional: partial AI pre-fill with editable confidence display
3. Vitest for `buildReceiptStructuredDraft`

### 12.3 Consolidate Route Error Handling

Migrate `receipt/parse`, `receipt/confirm`, `tracking/parse` → `respondWithRouteError`.

### 12.4 Integration Test: PURC → SHIP → STLM

1. receipt/parse or confirm → verified
2. tracking/parse → shipping/complete
3. settlement submit

---

## 13. v3 Spec Mapping (Code Level)

| ID | Status | Primary implementation |
|----|--------|------------------------|
| **PURC** | **Done (2026-07-23)** | `receipt/parse` + **`receipt/confirm`** + manual form + Admin Verify |
| **PURC-F** | **Done (2026-07-23)** | `seller-purchase-failed-view/` — manual entry guidance |
| **SHIP** | **Done (2026-07-21)** | `tracking/parse`, `leader-shipping-prep-view`, `shipping/complete` |
| **STLM** | **Done (2026-07-21)** | `leader-settlement-view`, `bank-account`, `settlement/route` |
| **RPTG** | **Done (2026-07-21)** | `seller-leader-report-view`, hosted → report link |
| **SRCH** | Done (2026-07-20) | `search-filter-bar`, URL sync |
| **APLY/CHKO** | Partial | apply API wired; VA webhook stub |
| **MYHD** | Done (2026-07-21) | `hosted-deals-list`, `seller-deal-metrics` |
| CHKO-02 | Stub | VA webhook 미구현 |
| CHKO-03 | Missing | client-only 5min hold |

---

## 14. Conclusion

코드베이스는 **Medusa module + leader-ops/document-ai utils + Server Action result pattern**으로 v3 공동구매 전체 흐름을 연결했다. **PokaCatch (포카캐치)** 브랜드로 UI/i18n이 통일되었고, PURC 단계는 AI 파싱 실패·추출 오류에 대해 **수동 입력·수정 confirm API**로 복원력을 갖추었다.

**2026-07-23 정리:**

- **브랜드** — 포카캐치 / PokaCatch i18n 전역
- **PURC** — `receipt/confirm`, `receipt-structured-entry-form`, parse fail URL 보존
- **문서** — `docs/MODULES.md` (Upstage·BFF 아키텍처)
- **프로덕션** — Vercel + Render 3-tier 운영

**우선 리팩터링 후보:**

1. CHKO-02 VA webhook + server-side seat hold
2. Route error handler 통합 (`receipt/*`, `tracking/parse`)
3. `/kr/home` server error fix
4. Route tree consolidation
5. E2E: receipt confirm → tracking → shipping → settlement

---

*본 문서는 2026-07-23 시점 코드베이스·MODULES.md·프로덕션 검증 결과를 바탕으로 작성되었습니다.*
