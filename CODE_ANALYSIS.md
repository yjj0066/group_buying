# Group Buying Site — Code Analysis

> **작성 기준일:** 2026-07-21 (최초 2026-07-15, 2026-07-18·2026-07-20 갱신)  
> **대상:** `group-buying-site/` monorepo (`@dtc/backend` + `@dtc/storefront` + 선택 `document-ai-bff`)  
> **관련 문서:** [README.md](./README.md) · [docs/api-contract-for-merge.md](./docs/api-contract-for-merge.md)

---

## 1. Executive Summary

본 프로젝트는 **Medusa v2 커스텀 모듈** 위에 공동구매 도메인을 올리고, **Next.js App Router** 스토어프론트와 **Flask Document AI BFF**(선택)를 분리 연동한 3-tier 구조이다.

| 레이어 | 역할 | Source of Truth |
|--------|------|-----------------|
| **Medusa Backend** | 주문·결제·재고·공구 CRUD·워크플로·정산·Document AI 게이트·신뢰 집계 | PostgreSQL |
| **Next.js Storefront** | UI·i18n·BFF·Server Actions (`{ ok, data \| error }`) | Medusa Store API |
| **Document AI BFF** | 영수증·송장 OCR (Upstage, 선택) | Flask + Upstage API |

**핵심 설계 원칙:**

1. **결제/주문은 Medusa만** — Document AI BFF는 commerce path에 끼지 않음
2. **실패 격리** — AI/로그 실패가 장바구니·결제 UX를 차단하지 않음 (Server Action은 throw 대신 `{ ok: false, error }` 반환)
3. **직렬화 계층 분리** — DB 모델 → `group-deal-store.ts` / `group-deal-account.ts` → Storefront types
4. **v3 이중 결제** — PG 에스크로 경로와 가상계좌(VA) 경로가 join/apply route에서 분기
5. **Pure function 집계** — 신뢰·단가 추천·송장 매칭은 DB 컬럼 없이 metadata + utils에서 계산
6. **KRW 전용** — 통화 선택 UI 제거, 모든 가격·결제는 원화 기준
7. **영수증 검증 게이트** — Admin Verify Receipt 전에는 송장 파싱·발송 확정 차단

### 2026-07-21 주요 변경

| 영역 | 구현 | 핵심 파일 |
|------|------|-----------|
| **Document AI · 영수증 (PURC)** | BFF/스텁 파싱, Admin 검증 게이트 | `receipt/parse/route.ts`, `group-deal-document-ai.ts` |
| **Document AI · 송장 (SHIP)** | 송장 OCR → 참여자 매칭 테이블 자동 채움 | `tracking/parse/route.ts`, `leader-tracking-match.ts`, `leader-shipping-prep-view/` |
| **매칭 사유 컬럼** | `확인 필요` 행에 미매칭·택배사 누락 등 사유 표시 | `ShippingMatchReviewReason`, `matchReviewReasons` i18n |
| **발송 확정** | workflow 대신 `processGroupDealShippingComplete()` 직접 호출 | `group-deal-leader-ops.ts`, `shipping/complete/route.ts` |
| **오류 처리** | Server Action `{ ok, error }` + `resolveMedusaErrorMessage()` duck-typing | `medusa-error.ts`, `route-error.ts`, `leader-shipping.ts` |
| **정산 계좌** | 가입 계좌 불러오기, 전체 계좌번호 metadata 저장 | `bank-account/route.ts`, `bank-account-form.tsx`, `getBankAccount()` |
| **내 공구 관리** | 정산 완료 → **종료** 표시, 리포트 링크 | `seller-deal-metrics.ts`, `hosted-deals-list/` |
| **리포트 백 링크** | RPTG → `/my/hosted` | `report/page.tsx` |
| **3프로세스 dev** | `DOCUMENT_AI_ENABLED=true` 시 BFF 별도 실행 | README, `hybrid-api-config.ts` |

### 2026-07-20 주요 변경

| 영역 | 구현 | 핵심 파일 |
|------|------|-----------|
| **상단 검색 → 공동구매** | 헤더 돋보기가 `/store?q=` 대신 `/group-buying?q=` 로 이동 | `product-search/`, `buildGroupBuyingSearchPath()` |
| **통화 선택 제거** | EUR/USD/KRW 선택 UI 삭제, KRW-only 정책 | `nav/index.tsx`, `currency-select/` 삭제 |
| **SRCH 필터** | 아이돌 그룹(검색형), 굿즈 종류, 가격 범위(슬라이더+입력) | `search-filter-bar/`, `price-range-filter/`, `group-buying-filter-match.ts` |
| **참여 apply API** | `POST /store/group-deals/:id/apply` (인증) | `apply/route.ts`, `group-deal-participation.ts` |
| **내 참여 목록** | 빈 배열도 정상 반환, deposit-confirm 소유권 검증 | `account-group-deals.ts`, `deposit-confirm/route.ts` |
| **총대 개설 수정** | 날짜 ISO 정규화, extra field 매핑, 데모 상품 시드 | `normalizeDraftDateToIsoDateTime.ts`, `seed-group-buy-demo-product.ts` |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Browser (6 locales, KRW-only UI)                          │
└─────────────────────────────────────────────────────────────────────────────┘
         │                              │                         │
         ▼                              ▼                         ▼
┌─────────────────┐          ┌──────────────────┐      ┌─────────────────┐
│  Next.js RSC    │          │  Next.js Client  │      │  Medusa Admin   │
│  Server Actions │          │  GB App islands  │      │  Verify Receipt │
│  { ok, data }   │          │  SHIP/STLM UI    │      │  Group Deals    │
└────────┬────────┘          └────────┬─────────┘      └────────┬────────┘
         │                            │                          │
         │  sdk.client.fetch          │                          │
         ▼                            ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Medusa Backend (:9000)                                    │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────┐  ┌───────────────────┐  │
│  │ group-buying │  │ workflows   │  │ subscribers│  │ PG modules        │  │
│  │ module       │  │ escrow/bill │  │ + cron     │  │ toss/stripe       │  │
│  └──────────────┘  └─────────────┘  └────────────┘  └───────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ utils: store · account · leader-ops · document-ai · route-error       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ api/store/me/group-deals: receipt/parse · tracking/parse ·           │  │
│  │   shipping/complete · settlement · bank-account                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
         │ DOCUMENT_AI_ENABLED=true                    │
         ▼                                             │
┌─────────────────────────────────────────────────────┴───────────────────┐
│  Document AI BFF (:5000) — optional                                        │
│  Flask + Upstage OCR — receipt/tracking parse jobs                         │
│  HYBRID_API_URL + HYBRID_API_SHARED_SECRET                                 │
└───────────────────────────────────────────────────────────────────────────┘
         │ (legacy, optional)
         ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  Flask AI Engine — product search only (/store?q=)                         │
└───────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Route Groups (Storefront)

| Group | 경로 | 렌더링 |
|-------|------|--------|
| `(landing)` | `/kr` | RSC + 역할 redirect + AI slider |
| **`(gb-app)`** | **`/home`, `/deals/*`, `/seller/*`, `/my/*`, `/auth/*`** | **RSC gate + client islands + tab bar** |
| `(main)` | `/group-buying`, `/store`, `/account`, `/products` | RSC + client islands |
| `(checkout)` | `/cart`, `/checkout` | client-heavy PG widgets |
| `app/api/ai` | BFF | Route Handlers (no UI) |

**총대 GB App 라우트 (2026-07-21):**

| 화면 ID | 경로 | 컴포넌트 |
|---------|------|----------|
| PURC | `/seller/deals/{id}/purchase-proof` | 구매 증빙 + AI 영수증 |
| SHIP | `/seller/deals/{id}/shipping` | `leader-shipping-prep-view/` |
| STLM | `/seller/deals/{id}/settlement` | `leader-settlement-view/` |
| RPTG | `/seller/deals/{id}/report` | `seller-leader-report-view/` |
| MYHD | `/my/hosted` | `hosted-deals-list/` |

**GB App vs 레거시 `(main)`:**

- **목록/검색:** `/kr/group-buying` (메인 SRCH) ↔ `/kr/home`, `/kr/search` (GB App)
- **상세/입금:** `/kr/group-buying/[id]` ↔ `/kr/deals/[dealId]`
- **마이:** `/kr/account/*` ↔ `/kr/my/*`

동적 세그먼트: participations 경로는 **`[participantId]`만** 사용.

### 2.2 Dev Process Layout

| 프로세스 | 포트 | 조건 |
|----------|------|------|
| Medusa backend | `:9000` | 항상 |
| Next.js storefront | `:8000` | 항상 |
| Document AI BFF | `:5000` | `DOCUMENT_AI_ENABLED=true` |
| Flask product search | `:5000` | 레거시, 기본 OFF |

루트 `pnpm dev`는 백엔드 + 스토어프론트만 기동. Document AI 사용 시 BFF를 별도 터미널에서 실행한다.

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

```typescript
class GroupBuyingModuleService extends MedusaService({
  GroupDeal,
  GroupDealParticipant,
  GroupDealOption,
  GroupDealParticipantSelection,
  GroupDealWaitlistEntry,
}) { ... }
```

**책임 분리:**

| 계층 | 파일 | 역할 |
|------|------|------|
| Service | `service.ts` | CRUD, join slot, waitlist, tracking bulk update, delivery confirm |
| Rules | `utils/group-deal-rules.ts` | joinable 검증, status evaluation |
| Store serialize | `utils/group-deal-store.ts` | Store API DTO, timeline stage |
| Account serialize | `utils/group-deal-account.ts` | My page DTO, participation stage |
| Leader ops | `utils/group-deal-leader-ops.ts` | 영수증 게이트, 발송 확정, 문서 저장 |
| Document AI | `utils/group-deal-document-ai.ts` | OCR 파싱, 참여자 매칭, AI 상태 |
| Leader trust | `utils/leader-trust-profile.ts` | MTRS 집계 |
| Route errors | `utils/route-error.ts` | MedusaError/Zod → HTTP 응답 |

### 3.2 Leader Operations — `group-deal-leader-ops.ts`

총대 후반기(구매증빙 → 발송 → 정산) 핵심 로직.

| 함수 | 역할 |
|------|------|
| `saveGroupDealDocumentImage()` | base64 data URL → `static/receipts` 또는 `static/tracking` |
| `assertPurchaseReceiptVerified()` | `purchase_receipt_status === verified` 아니면 NOT_ALLOWED |
| `assertAllParticipantsPaid()` | 활성 참여자 입금 확인 |
| `processGroupDealShippingComplete()` | **발송 확정** — 운송장 bulk update + 알림 emit |
| `markGroupDealShippingCompletedIfReady()` | 전원 tracking 등록 시 deal status 전환 |

**2026-07-21 변경:** 발송 확정이 workflow step 대신 `processGroupDealShippingComplete()`를 route에서 **직접 호출**한다. workflow 내부 예외가 generic 500으로 묻히던 문제를 줄인다.

```typescript
// shipping/complete/route.ts
const result = await processGroupDealShippingComplete(req.scope, {
  groupDealId: req.params.id,
  customerId,
  entries: body.entries,
})
```

**영수증 검증 게이트:**

```typescript
// assertPurchaseReceiptVerified — 송장 파싱·발송 확정 전 호출
if (deal.purchase_receipt_status !== GroupDealReceiptStatus.VERIFIED) {
  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    buildPurchaseReceiptShippingBlockMessage({ ... })
  )
}
```

Admin → Group Deals → Leader Management → **Verify Receipt** 완료 후에만 SHIP 단계 진행 가능.

### 3.3 Document AI — `group-deal-document-ai.ts`

**위치:** `apps/backend/src/utils/group-deal-document-ai.ts`

| 함수 | 역할 |
|------|------|
| `assertGroupDealLeader()` | leader_customer_id 검증 |
| `processGroupDealReceiptParse()` | 영수증 OCR → structured_receipt, validation |
| `processGroupDealTrackingParse()` | 송장 OCR → invoice_rows, auto match |
| `matchParticipantsToInvoiceRows()` | 백엔드 참여자 이름·주소 매칭 (safer disambiguation) |
| `mapFlaskJobToDocumentAiStatus()` | BFF job status → `parsed` / `needs_review` / `failed` |

**파이프라인:**

```
Client (base64 upload)
  → POST /store/me/group-deals/:id/receipt|tracking/parse
  → saveGroupDealDocumentImage (static/)
  → isDocumentAiEnabled() ?
       true  → flask-document-ai-client → BFF :5000 → Upstage
       false → document-extract-stub (dev fixture)
  → matchParticipantsToInvoiceRows (tracking only, confidence ≥ threshold)
  → bulkUpdateParticipantTracking (auto-matched entries)
  → serializeAccountGroupDeal + document_ai payload
```

**백엔드 참여자 매칭 (`resolveInvoiceRowParticipantMatches`):**

1. 송장 수령인명 ↔ order shipping_address 이름 (정규화·부분 일치)
2. 동명이인 → 주소 line / 우편번호로 disambiguation
3. 매칭 0건 → `NO_MATCH`, 2건+ → `MULTIPLE_MATCHES` → `review_conflicts`
4. 매칭 1건 + tracking_number → `bulkUpdateParticipantTracking`

### 3.4 API Routes — 총대 · Document AI (2026-07-21)

| Method | 경로 | Handler | try/catch |
|--------|------|---------|-----------|
| POST | `/store/me/group-deals/:id/receipt/parse` | `processGroupDealReceiptParse` | route-local |
| POST | `/store/me/group-deals/:id/tracking/parse` | `processGroupDealTrackingParse` | route-local |
| POST | `/store/me/group-deals/:id/shipping/complete` | `processGroupDealShippingComplete` | `respondWithRouteError` |
| POST | `/store/me/group-deals/:id/settlement` | settlement submit | 기존 |
| GET/POST | `/store/me/bank-account` | customer.metadata.refund_bank_account | 기존 |

**공통 route 오류 처리 (`route-error.ts`):**

```typescript
respondWithRouteError(res, error, {
  logLabel: "shipping/complete",
  fallbackMessage: "발송 확정 처리에 실패했습니다.",
})
// → MedusaError: status + message + type
// → ZodError: 400 + issue messages
// → 기타: 500 + fallbackMessage
```

### 3.5 Bank Account — `bank-account/route.ts`

**2026-07-21 변경:** `customer.metadata.refund_bank_account`에 **전체 `account_number`** 와 `account_number_masked`를 함께 저장한다.

```typescript
const bankAccount: RefundBankAccount = {
  bank_name: body.bank_name,
  bank_code: body.bank_code,
  account_number: body.account_number.trim(),      // 전체 번호 (신규)
  account_number_masked: maskAccountNumber(...),   // UI 표시용
  account_holder: body.account_holder,
  registered_at: new Date().toISOString(),
}
```

**레거시 계좌:** 마스킹값만 저장된 계좌는 STLM 「이 계좌 사용하기」 시 `registeredAccountResaveRequired` 안내 → 계좌 관리에서 재저장 필요.

### 3.6 Apply / Join / Deposit (참여 flow)

**Apply:** `apps/backend/src/api/store/group-deals/[id]/apply/route.ts`

1. `AuthenticatedMedusaRequest` — 로그인 필수
2. `prepareGroupDealCheckoutWorkflow` — slot reserve + participant
3. `generateVirtualAccount({ hold_minutes: 5 })`
4. metadata에 `participant_application_details` 저장

**Deposit confirm:** `deposit-confirm/route.ts` — customer owns participant 검증 (2026-07-20).

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

발송 확정은 **workflow 밖** `group-deal-leader-ops.ts` 직접 호출 (2026-07-21).

### 3.9 API Route Import Path Convention

Medusa API route는 **파일 깊이에 따라** `modules/group-buying`까지의 상대 `../` count가 달라진다.

| Route depth | `../` count | 예시 |
|-------------|-------------|------|
| `store/me/group-deals/[id]/shipping/complete/route.ts` | 7 | `../../../../../../../utils/group-deal-leader-ops` |
| `store/group-deals/[id]/apply/route.ts` | 6 | `../../../../../../modules/group-buying` |

---

## 4. Storefront Code Analysis

### 4.1 Server Actions Pattern (2026-07-21)

**원칙:** mutation Server Action은 **throw하지 않고** discriminated union을 반환한다.

```typescript
export type ConfirmLeaderShippingResult =
  | { ok: true; notified_count: number }
  | { ok: false; error: string }

export type GroupDealDocumentParseActionResult =
  | { ok: true; data: GroupDealDocumentParseResponse }
  | { ok: false; error: string }
```

| 파일 | Actions |
|------|---------|
| `lib/data/leader-shipping.ts` | `confirmLeaderShipping()` |
| `lib/data/group-deal-document-ai.ts` | `parseGroupDealReceiptDocument()`, `parseGroupDealTrackingDocument()` |
| `lib/data/leader-settlement.ts` | `submitLeaderSettlementRequest()` |
| `lib/data/group-deal-participation.ts` | `submitDealApplication()`, `confirmVirtualAccountDeposit()` |

**공통 흐름:**

```typescript
try {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return { ok: false, error: "로그인이 필요합니다..." }
  const data = await sdk.client.fetch(...)
  revalidateTag("group-deals")
  return { ok: true, data }
} catch (error) {
  return { ok: false, error: resolveMedusaErrorMessage(error) }
}
```

클라이언트 컴포넌트는 `if (!result.ok) setSubmitError(result.error)` 패턴으로 UX 오류를 표시한다.

### 4.2 Error Message Resolution — `medusa-error.ts`

`resolveMedusaErrorMessage(error: unknown): string`

| 입력 | 처리 |
|------|------|
| `FetchError` (instanceof 또는 duck-type: `status`, `statusText`) | body.message → 한국어 contextual fallback |
| `response.data.message` | axios-style |
| `fetch failed` | 백엔드 미기동 안내 |
| `An unknown error occurred.` | Document AI 503 / generic server 안내로 치환 |
| 영수증 게이트 메시지 | 원문 유지 (한국어) |

**duck-typing FetchError:**

```typescript
export const isFetchError = (error: unknown): error is FetchError => {
  if (error instanceof FetchError) return true
  // Error + status number → FetchError-like
}
```

Vitest: `lib/util/__tests__/medusa-error.spec.ts`

### 4.3 Document AI UI

| 컴포넌트 | 역할 |
|----------|------|
| `ai-verification-panel/` | 영수증 AI 결과·검증 UI (PURC) |
| `leader-shipping-prep-view/` | 송장 업로드, 매칭 테이블, 발송 확정 |
| `leader-purchase-proof/` (storage) | PURC 단계 로컬 draft (`loadLeaderPurchaseProofDraft`) |

**송장 매칭 유틸 — `leader-tracking-match.ts`:**

| 함수 | 역할 |
|------|------|
| `mergeInvoiceRowsIntoMatchTable()` | AI invoice_rows → 테이블 row |
| `mergeParticipantMatchRows()` | 참여자 manual row + orphan AI row 병합 |
| `findParticipantMatches()` | 이름 score + 동명이인 주소 disambiguation |
| `formatMatchReviewReasons()` | `reviewReasons[]` → i18n 라벨 |
| `buildParticipantManualRows()` | 참여자별 편집 가능 row 생성 |

**`ShippingMatchReviewReason` enum:**

| reason | 의미 |
|--------|------|
| `tracking_missing` | 송장번호 없음 |
| `carrier_missing` | 택배사 없음 |
| `low_confidence` | AI confidence < threshold |
| `ambiguous_participant` | 동명이인 다중 후보 |
| `no_participant_match` | 참여자 매칭 실패 |
| `manual_incomplete` | 수동 입력 미완료 |

**발송 확정 submit 규칙 (2026-07-21):**

- `buildParticipantManualRows()`로 **참여자 row만** submit 대상
- orphan/unmatched upload row는 confirm에서 제외
- 모든 participant row에 `trackingNumber` + `carrier` 필수

### 4.4 Settlement UI

| 컴포넌트 | 역할 |
|----------|------|
| `leader-settlement-view/` | 정산 breakdown, submit, success dialog |
| `leader-settlement/bank-account-form.tsx` | 인라인 계좌 입력 + 「이 계좌 사용하기」 |
| `leader-settlement/storage.ts` | local draft (bank account, submittedAt) |

**정산 계좌 흐름:**

```
settlement/page.tsx (RSC)
  → getBankAccount() → GET /store/me/bank-account
  → LeaderSettlementView(registeredBankAccount)
  → bank-account-form: 「이 계좌 사용하기」→ convertRefundBankAccountToSettlement()
  → submitLeaderSettlementRequest() → POST .../settlement
```

레거시 마스킹-only 계좌: `isRegisteredBankAccountComplete()` false → 재저장 안내.

### 4.5 Hosted Deals List (2026-07-21)

**위치:** `modules/account/components/hosted-deals-list/`

| 함수 (`seller-deal-metrics.ts`) | 역할 |
|----------------------------------|------|
| `applyHostedDealRuntimeOverrides()` | localStorage runtime state 병합 |
| `isHostedDealSettlementComplete()` | `settlement_submitted_at` / `leader_stage === settled` |
| `resolveHostedDealLink()` | 정산 완료 → RPTG, 아니면 seller dashboard |
| `resolveHostedDealTab()` | draft / recruiting / active / completed 탭 분류 |

**완료 탭 UX:**

- 정산 완료 공구 → stage 라벨 **「종료」** (`stageClosed` i18n)
- 카드 클릭 → `/seller/deals/{id}/report` (RPTG)
- RPTG 페이지 → 「내 공구 관리로」 백 링크 (`gbAppRoutes.myHosted`)

### 4.6 Data Layer (기존 + 2026-07-21)

| 파일 | 패턴 |
|------|------|
| `lib/data/group-deals.ts` | Medusa SDK → `/store/group-deals/*` |
| `lib/data/group-deal-participation.ts` | apply/deposit server actions |
| `lib/data/account-group-deals.ts` | hosted, participations, **`getBankAccount()`** |
| `lib/data/leader-shipping.ts` | **`confirmLeaderShipping()`** |
| `lib/data/group-deal-document-ai.ts` | receipt/tracking parse actions |
| `lib/data/leader-settlement.ts` | settlement submit |

**Mock fallback:** `NEXT_PUBLIC_ENABLE_MOCK_FALLBACK !== "true"` 이면 mock 미사용.

### 4.7 GB App Route Registry — `wireframe/routes.ts`

```typescript
export const gbAppRoutes = {
  home: (cc) => `/${cc}/home`,
  deal: (cc, dealId) => `/${cc}/deals/${dealId}`,
  sellerShipping: (cc, dealId) => `/${cc}/seller/deals/${dealId}/shipping`,
  sellerSettlement: (cc, dealId) => `/${cc}/seller/deals/${dealId}/settlement`,
  sellerDealReport: (cc, dealId) => `/${cc}/seller/deals/${dealId}/report`,
  myHosted: (cc) => `/${cc}/my/hosted`,
  // ...
}
```

### 4.8 i18n

6개 로케일 (ko, en, ja, es, zh, ru). GB App·SHIP·STLM 라벨은 `dictionaries/ko.ts` → `gbApp.*`.

**2026-07-21 추가 키:** `matchReviewReasons.*`, `stageClosed`, `registeredAccountResaveRequired`, Document AI 오류 문구.

---

## 5. Document AI BFF Pipeline

**위치:** `services/document-ai-bff/` (Flask, Python 3.11+)

```
Storefront Server Action (base64)
    ↓
Medusa POST .../receipt|tracking/parse
    ↓
group-deal-document-ai.ts
    ├── saveGroupDealDocumentImage → static/
    └── flask-document-ai-client.ts
            ↓ HTTP + HYBRID_API_SHARED_SECRET
        Document AI BFF (:5000)
            ↓ Upstage API
        structured_receipt | invoice_rows[]
    ↓
Medusa: matchParticipantsToInvoiceRows (tracking)
    ↓
Response: { group_deal, document_ai: { job_id, status, confidence, ... } }
```

| Env (backend) | 역할 |
|---------------|------|
| `DOCUMENT_AI_ENABLED` | `true` → BFF 호출, `false` → stub |
| `HYBRID_API_URL` | BFF base URL (default `http://127.0.0.1:5000`) |
| `HYBRID_API_SHARED_SECRET` | BFF ↔ Medusa shared secret |
| `DOCUMENT_AI_AUTO_VERIFY_CONFIDENCE` | auto-verify threshold |

| Env (BFF) | 역할 |
|-----------|------|
| `UPSTAGE_API_KEY` | Upstage OCR |
| `HYBRID_API_SHARED_SECRET` | Medusa 인증 |

**보안:** OCR 키는 브라우저에 노출하지 않음. 업로드는 Medusa route → BFF server-to-server.

**업로드 제한:**

- Next.js: `serverActions.bodySizeLimit: "32mb"`
- Backend: `GROUP_DEAL_DOCUMENT_MAX_UPLOAD_BYTES` (`group-deal-document-upload.ts`)

---

## 6. Data Flows

### 6.1 참여자 Flow (APLY → CHKO → MYJN)

```
deal-apply-form
  → submitDealApplication → POST /store/group-deals/:id/apply
  → VA 발급 + payment_deadline (5min)

deal-deposit-flow
  → confirmVirtualAccountDeposit → POST .../deposit-confirm
  → listMyParticipations → GET /store/me/group-deals/participations
```

### 6.2 총대 10단계 Flow (PURC → SHIP → STLM → RPTG)

```
개설 → 보증금 → 모집
  ↓
PURC: purchase-proof 업로드 → receipt/parse → Admin Verify Receipt
  ↓
개봉/배분 (opening)
  ↓
SHIP: tracking/parse → 매칭 테이블 → 수동 보정 → 발송 확정
      POST .../shipping/complete (assertPurchaseReceiptVerified)
  ↓
STLM: settlement → bank-account + POST .../settlement
  ↓
RPTG: report (settlement_submitted_at 이후)
  ↓
MYHD: hosted list 「종료」→ report link
```

### 6.3 Payment Dual Path

```
POST /join or POST /apply
    ├── virtual_account → /deposit (5min hold)
    │       → deposit-confirm
    └── cart_id (legacy) → /checkout (PG)
```

### 6.4 Participation Stage Resolution

```typescript
// group-deal-account.ts — priority:
delivery_confirmed_at → shipping → opening → purchasing → payment_complete → recruiting
```

---

## 7. Cross-Cutting Concerns

### 7.1 Authentication

| Context | Mechanism |
|---------|-----------|
| Store customer | Medusa session cookie → `getAuthHeaders()` |
| `/store/me/*`, apply | `AuthenticatedMedusaRequest` + middlewares |
| Leader Document AI | `assertGroupDealLeader()` |
| Admin Verify Receipt | Medusa Admin JWT |

### 7.2 Caching

- Server Actions: `revalidateTag("group-deals")` on mutations
- Middleware regions: 1h TTL + dev 2s timeout

### 7.3 Error Handling Stack (2026-07-21)

```
Backend route
  try/catch → respondWithRouteError(res, error)
    → JSON { message, type }

SDK fetch (storefront)
  throw FetchError { status, body }

Server Action
  catch → resolveMedusaErrorMessage(error)
    → { ok: false, error: string }

Client component
  if (!result.ok) setSubmitError(result.error)
```

---

## 8. Key Algorithms

### 8.1 Tracking Match (Frontend)

```typescript
// leader-tracking-match.ts
scoreNameMatch(recipient, participant)     // 100 exact, 80 partial
scoreAddressMatch(hint, participantAddress)  // 80 contains, 60 postal
findParticipantMatches(invoiceRow, participants)
  → 1 match: complete (if tracking+carrier OK)
  → 0 or 2+: needs_review + reviewReasons
```

**자동 매칭 조건 (README 정책):** 송장번호·택배사 추출 + 이름 매칭 + confidence ≥ 0.85

### 8.2 Tracking Match (Backend)

```typescript
// group-deal-document-ai.ts — resolveInvoiceRowParticipantMatches
// 이름 후보 → 동명이인 시 address_line/postal disambiguation
// matches.length === 1 → bulkUpdateParticipantTracking
```

### 8.3 Leader Trust Score (MTRS)

```typescript
trustScore = averageRating + completedBonus + onTimeBonus - disputePenalty - forfeiturePenalty
```

### 8.4 Hosted Deal Settlement Complete

```typescript
isHostedDealSettlementComplete(deal):
  leader_stage === "settled"
  || settlement_submitted_at
  || metadata.settlement_submitted_at
  || report_stage === "settled"
```

---

## 9. File / Directory Map

```
group-buying-site/
├── README.md
├── CODE_ANALYSIS.md
├── docs/
│   ├── api-contract-for-merge.md
│   └── upstage-receipt-integration.md
├── apps/
│   ├── backend/                              # @dtc/backend
│   │   └── src/
│   │       ├── modules/group-buying/
│   │       │   ├── service.ts
│   │       │   └── models/
│   │       ├── api/store/
│   │       │   ├── group-deals/[id]/
│   │       │   │   ├── apply/route.ts
│   │       │   │   ├── join/route.ts
│   │       │   │   └── deposit-confirm/route.ts
│   │       │   └── me/
│   │       │       ├── bank-account/route.ts          # 2026-07-21
│   │       │       └── group-deals/
│   │       │           ├── route.ts                     # hosted create
│   │       │           ├── hosted/route.ts
│   │       │           └── [id]/
│   │       │               ├── settlement/route.ts
│   │       │               ├── receipt/parse/route.ts   # 2026-07-21
│   │       │               ├── tracking/parse/route.ts  # 2026-07-21
│   │       │               └── shipping/complete/route.ts
│   │       ├── utils/
│   │       │   ├── group-deal-leader-ops.ts             # 2026-07-21
│   │       │   ├── group-deal-document-ai.ts              # 2026-07-21
│   │       │   ├── route-error.ts                         # 2026-07-21
│   │       │   ├── flask-document-ai-client.ts
│   │       │   ├── document-extract-stub.ts
│   │       │   ├── hybrid-api-config.ts
│   │       │   ├── purchase-receipt-guard-message.ts
│   │       │   ├── group-deal-store.ts
│   │       │   └── group-deal-account.ts
│   │       ├── workflows/
│   │       │   ├── group-deal-escrow.ts
│   │       │   └── group-deal-billing.ts
│   │       ├── jobs/group-deal-maintenance.ts
│   │       └── admin/routes/group-deals/
│   └── storefront/                          # @dtc/storefront
│       └── src/
│           ├── app/[countryCode]/
│           │   ├── (gb-app)/
│           │   │   ├── seller/deals/[dealId]/
│           │   │   │   ├── shipping/page.tsx
│           │   │   │   ├── settlement/page.tsx
│           │   │   │   └── report/page.tsx              # 2026-07-21 back link
│           │   │   └── my/hosted/page.tsx
│           │   └── (main)/group-buying/
│           ├── lib/
│           │   ├── data/
│           │   │   ├── leader-shipping.ts               # 2026-07-21
│           │   │   ├── group-deal-document-ai.ts        # 2026-07-21
│           │   │   ├── leader-settlement.ts
│           │   │   ├── account-group-deals.ts           # getBankAccount
│           │   │   └── group-deal-participation.ts
│           │   ├── util/
│           │   │   ├── medusa-error.ts                  # 2026-07-21
│           │   │   ├── leader-tracking-match.ts         # 2026-07-21
│           │   │   ├── seller-deal-metrics.ts           # 2026-07-21
│           │   │   ├── leader-settlement.ts
│           │   │   └── group-deal-filter-url.ts
│           │   └── wireframe/routes.ts
│           └── modules/
│               ├── group-buying/components/
│               │   ├── leader-shipping-prep-view/       # 2026-07-21
│               │   ├── leader-settlement-view/
│               │   ├── leader-settlement/bank-account-form.tsx
│               │   └── ai-verification-panel/
│               └── account/components/hosted-deals-list/  # 2026-07-21
└── services/
    └── document-ai-bff/                     # Flask BFF (선택)
        └── app/
```

---

## 10. Code Quality Assessment

### 10.1 Strengths

| 항목 | 설명 |
|------|------|
| **Domain separation** | rules/utils pure functions + unit tests |
| **Failure isolation** | AI/BFF 실패 → `{ ok: false }` UX, commerce path 분리 |
| **Serialization layer** | API shape decoupled from ORM |
| **Document AI pipeline** | Medusa gate + BFF + stub fallback |
| **Error UX** | `resolveMedusaErrorMessage` — generic 500 → actionable 한국어 |
| **Tracking match tests** | `leader-tracking-match.spec.ts`, `medusa-error.spec.ts` |

### 10.2 Technical Debt

| 항목 | 심각도 | 설명 |
|------|--------|------|
| Reviews in metadata | Medium | MTRS — no normalized Review entity |
| VA webhook | Medium | deposit-confirm still stub (CHKO-02) |
| Client-side SRCH filter | Medium | No server pagination at scale |
| Dual route trees | Medium | `(main)/group-buying` + `(gb-app)/deals` parallel |
| Legacy bank accounts | Low | 마스킹-only → 재저장 필요 |
| tracking/parse route | Low | `route-error.ts` 미사용 (route-local duplicate) |
| Runtime localStorage overrides | Low | hosted deal state가 client storage에 의존 |

### 10.3 Test Coverage

| Area | Coverage |
|------|----------|
| Backend utils | 9+ spec files |
| `medusa-error.ts` | Vitest spec |
| `leader-tracking-match.ts` | Vitest spec |
| Document AI routes | manual E2E recommended |
| Shipping complete | manual + backend log verification |

---

## 11. Security Notes

| Topic | Status |
|-------|--------|
| `/store/me/*` | Middleware auth — OK |
| Leader Document AI | `assertGroupDealLeader()` — OK |
| Receipt gate | Admin Verify Receipt before SHIP — OK |
| `deposit-confirm` | customer owns participant — OK |
| Bank account | **전체 account_number in metadata** — Admin/customer scope only; production encryption/at-rest policy 검토 필요 |
| Document upload | size limit + mime validation (data URL) — OK |
| OCR API keys | BFF server-side only — OK |
| Flask BFF | shared secret — rate limit TBD |
| Static documents | `/static/receipts`, `/static/tracking` — leader upload; access control 검토 |

---

## 12. Extension Guide

### 12.1 Wire Real Bank VA Webhook (CHKO-02)

1. Adapter in `utils/virtual-account.ts`
2. Webhook route for deposit confirmation
3. Keep apply/join response contract

### 12.2 Extend Document AI Matching

1. Backend: `resolveInvoiceRowParticipantMatches` threshold tuning
2. Frontend: `leader-tracking-match.ts` reason enum + i18n
3. Add Vitest fixtures for edge cases (동명이인, OCR typo)

### 12.3 Consolidate Route Error Handling

1. Migrate `receipt/parse`, `tracking/parse` to shared `respondWithRouteError`
2. Align message format with storefront `resolveMedusaErrorMessage`

### 12.4 Server-Side SRCH Filter

1. Extend `GET /store/group-deals` query params
2. Keep URL param names in `group-deal-filter-url.ts`

---

## 13. v3 Spec Mapping (Code Level)

| ID | Status | Primary implementation |
|----|--------|------------------------|
| **PURC** | **Done (2026-07-21)** | `receipt/parse`, `ai-verification-panel`, Admin Verify |
| **SHIP** | **Done (2026-07-21)** | `tracking/parse`, `leader-shipping-prep-view`, `shipping/complete` |
| **STLM** | **Done (2026-07-21)** | `leader-settlement-view`, `bank-account`, `settlement/route` |
| **RPTG** | **Done (2026-07-21)** | `seller-leader-report-view`, hosted → report link |
| **SRCH (main)** | Done (2026-07-20) | `search-filter-bar`, URL sync |
| **APLY/CHKO** | Partial | apply API wired; VA webhook stub |
| **MYHD** | Done (2026-07-21) | `hosted-deals-list`, `seller-deal-metrics` |
| MTRS-01 | Done | leader-trust-profile |
| CHKO-02 | Stub | VA webhook 미구현 |
| CHKO-03 | Missing | client-only 5min hold |

---

## 14. Conclusion

코드베이스는 **Medusa module + leader-ops utils + Server Action result pattern**으로 v3 공동구매 후반기(구매증빙 → 송장 → 발송 → 정산 → 리포트)를 연결했다.

**2026-07-21 정리:**

- **Document AI** — Medusa route → BFF/스텁 → 프론트 매칭 테이블 + 사유 컬럼; 영수증 Admin 검증 게이트
- **발송 확정** — workflow 제거, `processGroupDealShippingComplete()` 직접 호출 + route try/catch
- **오류 UX** — `{ ok, error }` Server Actions + `resolveMedusaErrorMessage()` duck-typing
- **정산** — 가입 계좌 불러오기, 전체 계좌번호 저장, STLM 인라인 폼
- **내 공구** — 정산 완료 「종료」+ RPTG 링크, report → my/hosted 백 네비

**우선 리팩터링 후보:**

1. CHKO-02 VA webhook + server-side seat hold
2. `tracking/parse` route → shared `route-error.ts`
3. Route tree consolidation — `(main)/group-buying` vs `(gb-app)/deals`
4. Bank account metadata encryption policy
5. Integration tests: receipt verify → tracking parse → shipping complete → settlement

---

*본 문서는 2026-07-21 시점 코드베이스 정적 분석 결과입니다.*
