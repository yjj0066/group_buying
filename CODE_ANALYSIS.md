# Group Buying Site — Code Analysis

> **작성 기준일:** 2026-07-15  
> **대상:** `group-buying-site/` monorepo (`@dtc/backend` + `@dtc/storefront`)  
> **관련 문서:** [README.md](./README.md) · [PROJECT_STATUS.md](./PROJECT_STATUS.md) · [docs/api-contract-for-merge.md](./docs/api-contract-for-merge.md)

---

## 1. Executive Summary

본 프로젝트는 **Medusa v2 커스텀 모듈** 위에 공동구매 도메인을 올리고, **Next.js App Router** 스토어프론트와 **Flask 하이브리드 AI**를 분리 연동한 3-tier 구조이다.

| 레이어 | 역할 | Source of Truth |
|--------|------|-----------------|
| **Medusa Backend** | 주문·결제·재고·공구 CRUD·워크플로 | PostgreSQL |
| **Next.js Storefront** | UI·i18n·BFF·Server Actions | Medusa Store API + Flask BFF |
| **Flask (Practice)** | 검색·추천·행동 로그·임베딩 | Flask PostgreSQL (SearchDocument) |

**핵심 설계 원칙:**

1. **결제/주문은 Medusa만** — Flask는 commerce path에 끼지 않음
2. **실패 격리** — Flask/로그 실패가 장바구니·결제 UX를 차단하지 않음
3. **직렬화 계층 분리** — DB 모델 → `group-deal-store.ts` / `group-deal-account.ts` → Storefront types
4. **v3 이중 결제** — PG 에스크로 경로와 가상계좌(VA) 경로가 join route에서 분기

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Browser (6 locales)                              │
└─────────────────────────────────────────────────────────────────────────┘
         │                              │                    │
         ▼                              ▼                    ▼
┌─────────────────┐          ┌──────────────────┐   ┌─────────────────┐
│  Next.js RSC    │          │  Next.js Client  │   │  Medusa Admin   │
│  Server Actions │          │  Components      │   │  (Vite + SDK)   │
└────────┬────────┘          └────────┬─────────┘   └────────┬────────┘
         │                            │                       │
         │  sdk.client.fetch          │  fetch /api/ai/*      │  sdk.client.fetch
         ▼                            ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Medusa Backend (:9000)                              │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────┐  ┌───────────────┐  │
│  │ group-buying │  │ workflows   │  │ subscribers│  │ PG modules    │  │
│  │ module       │  │             │  │ + cron     │  │ toss/stripe   │  │
│  └──────────────┘  └─────────────┘  └────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
         │ search-index feed                    ▲
         ▼                                        │ events / search / recommendations
┌─────────────────────────────────────────────────────────────────────────┐
│                    Flask AI Engine (:5000)                               │
│  SearchDocument · Embedding · SearchLog · Recommendations                │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Route Groups (Storefront)

| Group | 경로 | 렌더링 |
|-------|------|--------|
| `(landing)` | `/kr` | RSC template + client sections + AI slider |
| `(main)` | `/store`, `/group-buying`, `/account`, `/products` | RSC + client islands |
| `(checkout)` | `/cart`, `/checkout` | client-heavy PG widgets |
| `app/api/ai` | BFF | Route Handlers (no UI) |

---

## 3. Backend Code Analysis

### 3.1 Module Pattern — `GroupBuyingModuleService`

**위치:** `apps/backend/src/modules/group-buying/service.ts`

Medusa v2 `MedusaService({ Model... })` 패턴을 따른다. 5개 엔티티를 단일 서비스로 관리한다.

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
| Service | `service.ts` | CRUD, join slot, waitlist match, status transition |
| Rules | `utils/group-deal-rules.ts` | joinable 검증, status evaluation, participant count |
| Options | `utils/group-deal-options.ts` | selection limit, 1차금 계산 |
| Admin rules | `utils/group-deal-admin-rules.ts` | deposit guard, status transition guard |
| Store serialize | `utils/group-deal-store.ts` | Store API DTO, timeline stage |
| Account serialize | `utils/group-deal-account.ts` | My page DTO, participation stage |

**분석:** 비즈니스 규칙이 service 메서드 내부가 아닌 `utils/` pure function으로 분리되어 있어 unit test 가능 (`__tests__/` 9개 spec).

### 3.2 State Machine — `GroupDealStatus`

**위치:** `apps/backend/src/types/group-buying.ts`

```typescript
export enum GroupDealStatus {
  DRAFT = "draft",
  OPEN = "open",                    // ← canonical "active recruiting" (ACTIVE 제거됨)
  MINIMUM_REACHED = "minimum_reached",
  CLOSED = "closed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  SETTLED = "settled",
}
```

**Store 노출 필터:**

```typescript
// group-deal-store.ts
const STORE_VISIBLE_STATUSES = [OPEN, MINIMUM_REACHED, CLOSED]
```

**주의:** `group-deal-maintenance.ts` 등에서 과거 `ACTIVE` 참조가 있었으나 `OPEN`으로 통일됨. 상태 전이 로직은 `evaluateDealStatus()` + admin guards가 담당.

### 3.3 Join Route — v3 VA + Legacy Cart

**위치:** `apps/backend/src/api/store/group-deals/[id]/join/route.ts`

**흐름:**

1. Zod validate (`PostStoreJoinGroupDeal`)
2. `prepareGroupDealCheckoutWorkflow` — slot reserve + cart/participant
3. `generateVirtualAccount({ hold_minutes: 5 })` — VA stub
4. `updateGroupDeals` metadata — `participant_virtual_accounts`, `payment_model: virtual_account`
5. Response — `virtual_account`, `checkout_path: /group-buying/{id}/deposit?participant=...`

```typescript
const virtualAccount = generateVirtualAccount({
  reference_id: participantId,
  amount: Number(result.first_payment_amount ?? 0),
  currency_code: String(dealRecord.currency_code ?? "krw"),
  hold_minutes: 5,
})
```

**분석:** workflow는 cart 기반 PG 경로도 지원하지만, join route가 VA metadata를 덮어써 v3 기본 UX는 deposit 페이지로 유도한다. `first_payment_amount`는 `computeFirstPaymentAmount()`에서 option snapshot 기반.

### 3.4 Serialization Layer

**Store API (`group-deal-store.ts`):**

- `serializeStoreGroupDeal()` — idol_group, goods_type, timeline, receipt fields
- `resolveStoreDealTimelineStage()` — 7단계: created → recruiting → payment → purchasing → **opening** → shipping → settlement
- `serializeStoreGroupDealParticipant()` — payment_deadline, selections

**Account API (`group-deal-account.ts`):**

- `resolveParticipationStage()` — MYJN 타임라인 (opening 포함)
- `resolveLeaderStage()` — 총대 hosted deals
- `readGroupBuyingPreferences()` — `preferred_role: participant | leader`

**Leader stats (`group-deal-leader-stats.ts`):**

```typescript
// leader_customer_id 기준 deal count → is_first_time_leader, leader_role_number
```

### 3.5 Stub Integrations (v3 Placeholders)

| Stub | 파일 | 용도 |
|------|------|------|
| Virtual Account | `utils/virtual-account.ts` | VA 번호 생성, expires_at |
| Document AI | `utils/document-extract-stub.ts` | 영수증 OCR → structured fields |
| Admin receipt | `api/admin/group-deals/[id]/receipt/route.ts` | upload → extract → auto-verify |

이들은 **production adapter 교체 지점**으로 설계됨 — interface는 route/service에 고정, implementation만 swap.

### 3.6 Admin Extension

**SDK 패턴:**

```
admin/lib/sdk.ts          → Medusa JS SDK singleton (__BACKEND_URL__)
admin/lib/admin-fetch.ts  → sdk.client.fetch wrapper (JWT 자동)
```

**문제 해결:** raw `fetch` + cookie는 Admin SPA에서 401 발생 → SDK가 session JWT를 `/admin/*` 요청에 첨부.

**UI:** `admin/routes/group-deals/` — React Query hooks, LeaderManagementPanel (receipt verify/reject).

### 3.7 Workflows & Events

| Workflow | Trigger | Effect |
|----------|---------|--------|
| `prepareGroupDealCheckoutWorkflow` | POST join | participant PENDING, cart |
| `captureGroupDealPaymentsWorkflow` | minimum_reached event | PG batch capture |
| `processOverdueParticipantsWorkflow` | cron | slot vacate |
| `confirmParticipantDeliveryWorkflow` | POST confirm-delivery | SETTLED path |

Subscribers는 `group_deal.updated`, `order.placed` 등 Medusa event bus에 연결.

---

## 4. Storefront Code Analysis

### 4.1 Data Layer Pattern

**Server Actions (`"use server"`):**

| 파일 | 패턴 |
|------|------|
| `lib/data/group-deals.ts` | Medusa SDK → `/store/group-deals/*` |
| `lib/data/cart.ts` | cart CRUD, `addToCart`, `placeOrder` |
| `lib/data/account-group-deals.ts` | authed `/store/me/*` |
| `lib/data/flask-search.ts` | Flask HTTP (2.5s timeout) |
| `lib/data/flask-behavior-log.ts` | Flask event forward (swallow errors) |

**Client utilities (no server):**

| 파일 | 패턴 |
|------|------|
| `lib/util/flask-behavior-log.ts` | `void fetch().catch()` fire-and-forget |
| `lib/util/group-deal-filters.ts` | pure filter on in-memory deals |
| `lib/util/group-deal-trust.ts` | client-side trust heuristic + leader flags |

### 4.2 Flask Integration Architecture

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│ Client Component │────▶│ /api/ai/* (BFF)     │────▶│ Flask :5000  │
│ (slider, track*) │     │ Route Handler       │     │              │
└──────────────────┘     └─────────────────────┘     └──────────────┘
┌──────────────────┐     ┌─────────────────────┐
│ RSC (paginated-  │────▶│ flask-search.ts     │────▶ Flask (direct)
│  products)       │     │ (server)            │
└──────────────────┘     └─────────────────────┘
                              │
                              ▼
                         listProducts(id=[])
                         orderProductsByIds()
```

**검색 (`paginated-products.tsx`):**

1. `searchProducts(query)` → Flask IDs + synonym meta
2. `listProductsWithSort({ id: productIds })` — Medusa hydrate
3. `orderProductsByIds()` — Flask ranking preserved
4. Flask 실패 → empty/unavailable UI (Medusa `q=` fallback **없음**)

**추천 (`ai-recommendation-slider/index.tsx`):**

- Client `useEffect` → `GET /api/ai/recommendations?context=landing|similar`
- BFF hydrates products + `group_deal_ids` map
- Empty → component returns `null` (layout safe)

**행동 로그 (3-layer safety):**

```typescript
// Layer 1: Client — never throws
void fetch("/api/ai/events", { keepalive: true }).catch(() => {})

// Layer 2: BFF — always 202
catch { /* swallow */ }

// Layer 3: Server forward — try/catch, 2.5s timeout
await forwardFlaskBehaviorEvent(event) // internal catch
```

### 4.3 Component Composition

**DETL (Group Deal Detail):**

```
GroupDealDetailTemplate (RSC)
├── LeaderTrustPanel (client) — first-time vs experienced
├── GroupDealTimeline (client) — 7 stages
├── GroupDealProgress
├── PurchaseReceiptPanel — structured fields
├── DealJoinSection
│   ├── MemberSeatPicker
│   └── JoinDealForm → startGroupDealCheckout → router.push(deposit)
└── AiRecommendationSlider (client) — similar products
```

**SRCH (List):**

```
GroupDealsListTemplate
├── GroupDealFilters (client) — query, idol, member, urgent
└── GroupDealsCatalog → GroupDealCard — trust badge, deposit badge
```

**MYJN (Account):**

```
ParticipationsList → ParticipationTimeline (opening stage)
ParticipationDetail → ReviewForm, DisputeForm, tracking external link
RoleSwitcher → PUT /store/me/preferences { preferred_role }
BankAccountForm → POST /store/me/bank-account
```

### 4.4 Type System (Storefront)

| Storefront type | Backend source |
|-----------------|----------------|
| `types/group-deal.ts` | `serializeStoreGroupDeal` shape |
| `types/account-group-deals.ts` | `group-deal-account.ts` |
| `types/flask-search.ts` | Flask API contract |
| `types/flask-behavior-log.ts` | Event payloads |
| `types/landing-deal.ts` | `landing-deals.ts` mapper |

**Gap:** Storefront `GroupDealStatus` union과 backend enum은 mirror 관계이나 자동 sync 없음 — API 변경 시 수동 업데이트 필요.

### 4.5 i18n Architecture

```
i18n/config.ts           → locale routing (kr default)
i18n/dictionaries/ko.ts → full Dictionary
i18n/dictionaries/landing-shared.ts → landingKo, landingEn
i18n/provider.tsx        → useDictionary() (client)
i18n/server.ts           → getServerDictionary() (RSC)
```

6개 로케일 (ko, en, ja, es, zh, ru). ja/es/zh/ru는 landing을 `landingEn` 재사용.

---

## 5. Cross-Cutting Concerns

### 5.1 Authentication

| Context | Mechanism |
|---------|-----------|
| Store customer | Medusa session cookie → `getAuthHeaders()` in Server Actions |
| `/store/me/*` | `api/store/me/middlewares.ts` — `auth_context.actor_id` |
| Admin | Medusa Admin JWT via `@medusajs/js-sdk` |
| Flask | Optional `customer_id` query param (no auth required for search) |

### 5.2 Caching

- Server Actions: `revalidateTag` on cart/customer mutations
- RSC products: `cache: "force-cache"` + tags in production
- Flask calls: `cache: "no-store"` (always fresh)

### 5.3 Error Handling

| Layer | Pattern |
|-------|---------|
| Medusa API | `medusaError()` wrapper → throw with message |
| Flask | return `null`, console.warn — degrade gracefully |
| Admin fetch | FetchError → user-friendly Korean message |
| Behavior log | silent swallow at all layers |

### 5.4 Payment Dual Path

```
                    POST /join
                        │
           ┌────────────┴────────────┐
           ▼                         ▼
    virtual_account path        cart_id path
           │                         │
           ▼                         ▼
    /deposit page              /checkout
    (5min hold UI)             (Toss/Stripe)
           │                         │
           ▼                         ▼
    stub auto-confirm          /order/confirmed
    + behavior log             + behavior log
```

**리스크:** 두 경로가 동시에 metadata에 기록될 수 있음. `payment_model: virtual_account` metadata로 구분.

---

## 6. Key Algorithms

### 6.1 Flask Search Merge

```typescript
// semantic_results 우선, results 보조, medusa_product_id dedupe
for (const item of [...semantic, ...keyword]) {
  if (!seen.has(id)) merged.push(item)
}
```

### 6.2 Participation Stage Resolution

```typescript
// group-deal-account.ts — priority order:
delivery_confirmed_at → shipping (tracking) → opening (receipt verified)
→ purchasing (closed) → payment_complete (confirmed) → recruiting
```

### 6.3 Leader Trust (Storefront)

```typescript
// group-deal-trust.ts
calculateLeaderTrustScore(deal)  // heuristic from metadata
isFirstTimeLeader(deal)          // backend leader_role_number === 1
getLeaderRoleNumber(deal)        // from API serialized field
```

Backend count가 source of truth; frontend heuristic은 보조 배지용.

### 6.4 Group Deal Filters (Client)

```typescript
// group-deal-filters.ts — pure functions on GroupDeal[]
filterGroupDeals(deals, state)  // query min 2 chars, idol, member, urgent, price
extractGroupDealFacets(deals)   // dynamic filter options
```

SRCH 필터는 **client-side** — 서버 pagination/filter API 없음.

---

## 7. Dependency Graph (Simplified)

```
join/route.ts
  ├── prepareGroupDealCheckoutWorkflow
  │     ├── GroupBuyingModuleService.validateJoinSelections
  │     ├── assertDealJoinable (group-deal-rules)
  │     └── computeFirstPaymentAmount (group-deal-options)
  ├── generateVirtualAccount
  └── serializeStoreGroupDealParticipant

paginated-products.tsx
  ├── searchProducts (flask-search)
  ├── listProductsWithSort (products)
  ├── orderProductsByIds
  └── getProductGroupDealIndex (group-deals)

ai-recommendation-slider
  └── fetch /api/ai/recommendations
        ├── getRecommendationsViaAiEngine (ai-engine)
        └── hydrateRecommendedProducts
              ├── listProducts
              └── getProductGroupDealIndex
```

---

## 8. Code Quality Assessment

### 8.1 Strengths

| 항목 | 설명 |
|------|------|
| **Domain separation** | rules/options/admin-rules pure functions + tests |
| **Hybrid isolation** | Flask failure doesn't break commerce |
| **Serialization layer** | API shape decoupled from MikroORM models |
| **i18n coverage** | 6 locales, typed Dictionary |
| **Progressive enhancement** | AI slider/recommendations optional (null render) |
| **Admin SDK fix** | Proper JWT for custom admin routes |

### 8.2 Technical Debt

| 항목 | 심각도 | 설명 |
|------|--------|------|
| Dual payment paths | Medium | VA + PG cart logic overlap in join |
| Client-side SRCH filter | Medium | No server pagination at scale |
| Type mirror drift | Low | Frontend/backend status types manual |
| Stub adapters | Low | VA, document AI, deposit confirm — need real impl |
| `Record<string, unknown>` casts | Low | join route participant/deal casting |
| Mock landing fallback | Low | MOCK_DEALS masks empty API state |

### 8.3 Test Coverage

| Area | Coverage |
|------|----------|
| Backend utils | 9 spec files (rules, options, escrow, store, admin) |
| Storefront | Minimal — no component/integration tests observed |
| Flask BFF | No automated tests — manual + contract doc |

---

## 9. Security Notes

| Topic | Status |
|-------|--------|
| Admin JWT | SDK-based — OK after fix |
| `/store/me/*` | Middleware auth — OK |
| Flask BFF | No auth on `/api/ai/*` — acceptable for public search; rate limit TBD |
| Bank account | Stored in `customer.metadata.refund_bank_account` — masked number |
| Billing keys | `secure-billing-key.ts` encryption |
| Behavior log | No PII beyond product/order IDs — review before prod |

---

## 10. Extension Guide

### 10.1 Replace VA Stub with Real Bank API

1. Implement adapter in `utils/virtual-account.ts`
2. Add webhook route for deposit confirmation (CHKO-02)
3. Update `group-deal-maintenance` or subscriber to confirm participant on webhook
4. Keep `checkout_path` contract unchanged for storefront

### 10.2 Add Flask Event Types

1. Extend `types/flask-behavior-log.ts`
2. Add `track*` in `lib/util/flask-behavior-log.ts`
3. Map in `lib/data/flask-behavior-log.ts` `forwardFlaskBehaviorEvent`
4. Wire component hook — always fire-and-forget

### 10.3 New Store API Field

1. Add to model/metadata in `modules/group-buying/models`
2. Expose in `serializeStoreGroupDeal()` or `serializeAccountParticipation()`
3. Mirror in `apps/storefront/src/types/group-deal.ts`
4. Consume in component + i18n if needed

### 10.4 Server-Side SRCH Filter

1. Add query params to `GET /store/group-deals`
2. Implement in `query-group-deals.ts`
3. Replace client `filterGroupDeals()` with API params in catalog

---

## 11. File Reference Index

### Backend — Critical Path

| File | Lines of concern |
|------|------------------|
| `types/group-buying.ts` | All enums, DTOs |
| `modules/group-buying/service.ts` | Core domain operations |
| `utils/group-deal-rules.ts` | Join/status rules |
| `utils/group-deal-store.ts` | Store API serialization |
| `utils/group-deal-account.ts` | Account API serialization |
| `api/store/group-deals/[id]/join/route.ts` | v3 VA join |
| `workflows/group-deals.ts` | Checkout workflow |
| `jobs/group-deal-maintenance.ts` | Cron (OPEN status) |

### Storefront — Critical Path

| File | Lines of concern |
|------|------------------|
| `lib/data/flask-search.ts` | Search API |
| `lib/util/flask-behavior-log.ts` | Analytics client |
| `modules/store/templates/paginated-products.tsx` | Search results |
| `modules/products/components/ai-recommendation-slider/` | Recommendations |
| `modules/group-buying/components/join-deal-form/` | Join UX |
| `modules/group-buying/components/virtual-account-deposit/` | CHKO |
| `modules/group-buying/components/leader-trust-panel/` | Trust UI |
| `app/api/ai/events/route.ts` | Behavior BFF |

---

## 12. Conclusion

코드베이스는 **Medusa module + workflow** 패턴을 충실히 따르며, v3 스펙(가상계좌·개봉·구조화 영수증)을 **stub adapter**와 **serialization 확장**으로 흡수했다. Flask 연동은 **BFF + fire-and-forget** 패턴으로 commerce critical path와 명확히 분리되어 있다.

**우선 리팩터링 후보:**

1. Join route — VA vs cart path를 strategy pattern으로 명시적 분리
2. SRCH — server-side filter/pagination API
3. Stub → production adapter (VA webhook, document OCR)
4. Storefront integration tests for join → deposit → behavior log flow

---

*본 문서는 2026-07-15 시점 코드베이스 정적 분석 결과입니다.*
