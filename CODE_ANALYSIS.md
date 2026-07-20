# Group Buying Site — Code Analysis

> **작성 기준일:** 2026-07-20 (최초 2026-07-15, 2026-07-18 갱신)  
> **대상:** `group-buying-site/` monorepo (`@dtc/backend` + `@dtc/storefront`)  
> **관련 문서:** [README.md](./README.md) · [PROJECT_STATUS.md](./PROJECT_STATUS.md) · [docs/api-contract-for-merge.md](./docs/api-contract-for-merge.md)

---

## 1. Executive Summary

본 프로젝트는 **Medusa v2 커스텀 모듈** 위에 공동구매 도메인을 올리고, **Next.js App Router** 스토어프론트와 **Flask 하이브리드 AI**(선택)를 분리 연동한 3-tier 구조이다.

| 레이어 | 역할 | Source of Truth |
|--------|------|-----------------|
| **Medusa Backend** | 주문·결제·재고·공구 CRUD·워크플로·정산·신뢰 집계 | PostgreSQL |
| **Next.js Storefront** | UI·i18n·BFF·Server Actions | Medusa Store API + Flask BFF |
| **Flask (Practice)** | 상품 검색·추천·행동 로그 (선택) | Flask PostgreSQL |

**핵심 설계 원칙:**

1. **결제/주문은 Medusa만** — Flask는 commerce path에 끼지 않음
2. **실패 격리** — Flask/로그 실패가 장바구니·결제 UX를 차단하지 않음
3. **직렬화 계층 분리** — DB 모델 → `group-deal-store.ts` / `group-deal-account.ts` → Storefront types
4. **v3 이중 결제** — PG 에스크로 경로와 가상계좌(VA) 경로가 join/apply route에서 분기
5. **Pure function 집계** — 신뢰·단가 추천은 DB 컬럼 없이 metadata + utils에서 계산
6. **KRW 전용** — 통화 선택 UI 제거, 모든 가격·결제는 원화 기준

### 2026-07-20 주요 변경

| 영역 | 구현 | 핵심 파일 |
|------|------|-----------|
| **상단 검색 → 공동구매** | 헤더 돋보기가 `/store?q=` 대신 `/group-buying?q=` 로 이동 | `product-search/`, `buildGroupBuyingSearchPath()` |
| **통화 선택 제거** | EUR/USD/KRW 선택 UI 삭제, KRW-only 정책 | `nav/index.tsx`, `currency-select/` 삭제 |
| **로그인 버튼** | `variant="transparent"` → `variant="primary"` (가시성) | `account/components/login/` |
| **SRCH 필터** | 아이돌 그룹(검색형), 굿즈 종류, 가격 범위(슬라이더+입력) | `search-filter-bar/`, `price-range-filter/`, `group-buying-filter-match.ts` |
| **URL 필터 동기화** | `q`, `group`, `goods`, `minPrice`, `maxPrice` 등 | `group-deal-filter-url.ts`, `use-group-deal-search.ts` |
| **참여 apply API** | `POST /store/group-deals/:id/apply` (인증) | `apply/route.ts`, `group-deal-participation.ts` |
| **내 참여 목록** | 빈 배열도 정상 반환, deposit-confirm 소유권 검증 | `account-group-deals.ts`, `deposit-confirm/route.ts` |
| **총대 개설 수정** | 날짜 ISO 정규화, extra field 매핑, 데모 상품 시드 | `normalizeDraftDateToIsoDateTime.ts`, `seed-group-buy-demo-product.ts` |

### 2026-07-18 주요 변경 (GB App)

| 영역 | 구현 | 핵심 파일 |
|------|------|-----------|
| **GB App UI** | `(gb-app)` — 참여자·총대·마이 와이어프레임 | `wireframe/routes.ts`, `(gb-app)/**/page.tsx` |
| **INP 최적화** | debounce 200ms, React.memo 카드, optimistic mode switch | `use-debounced-value.ts`, `group-deal-card-list/` |
| **라우트 수정** | stale `[id]` vs `[participantId]` 충돌 제거 | `(gb-app)/my/participations/[participantId]/` |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Browser (6 locales, KRW-only UI)               │
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
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ utils: rules · store · account · leader-trust · price-rec       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
         │ search-index feed (optional)           ▲
         ▼                                        │ events / search / recommendations
┌─────────────────────────────────────────────────────────────────────────┐
│                    Flask AI Engine (:5000) — optional in dev             │
│  Product search only (/store?q=); group-buy search uses Medusa catalog   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Route Groups (Storefront)

| Group | 경로 | 렌더링 |
|-------|------|--------|
| `(landing)` | `/kr` | RSC + 역할 redirect + AI slider |
| **`(gb-app)`** | **`/home`, `/deals/*`, `/seller/*`, `/my/*`, `/auth/*`** | **RSC gate + client islands + tab bar** |
| `(main)` | `/group-buying`, `/store`, `/account`, `/products` | RSC + client islands |
| `(checkout)` | `/cart`, `/checkout` | client-heavy PG widgets |
| `app/api/ai` | BFF | Route Handlers (no UI) |

**검색 진입점 (2026-07-20):**

| UI | 이전 | 현재 |
|----|------|------|
| 헤더 돋보기 (`ProductSearch`) | `/store?q=` (Flask 상품 검색) | **`/group-buying?q=`** (공구 카탈로그) |
| Nav **공동구매** 링크 | `/group-buying` | 동일 |
| `/store?q=` | Flask semantic search | **레거시 상품 카탈로그 전용** |

**GB App vs 레거시 `(main)`:**

- **목록/검색:** `/kr/group-buying` (메인 SRCH) ↔ `/kr/home`, `/kr/search` (GB App)
- **상세/입금:** `/kr/group-buying/[id]` ↔ `/kr/deals/[dealId]`
- **마이:** `/kr/account/*` ↔ `/kr/my/*`

동적 세그먼트: participations 경로는 **`[participantId]`만** 사용.

### 2.2 Dev Performance Defaults

| 설정 | 파일 | dev 기본 |
|------|------|----------|
| Flask 활성화 | `lib/config/flask-search.ts` | **OFF** |
| Flask 타임아웃 | `getFlaskRequestTimeoutMs()` | **800ms** |
| Region fetch | `middleware.ts` | **2s** abort |
| Next dev bundler | `storefront/package.json` | **Turbopack** |
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
| Service | `service.ts` | CRUD, join slot, waitlist, delivery confirm, D+7 auto-confirm |
| Rules | `utils/group-deal-rules.ts` | joinable 검증, status evaluation |
| Store serialize | `utils/group-deal-store.ts` | Store API DTO, timeline stage |
| Account serialize | `utils/group-deal-account.ts` | My page DTO, participation stage |
| Leader trust | `utils/leader-trust-profile.ts` | MTRS 집계 |
| Price rec | `utils/group-deal-price-recommendations.ts` | DASH 권장가 |
| Validation errors | `utils/format-group-deal-validation-error.ts` | 사용자 친화적 오류 메시지 |

### 3.2 Apply Route — GB App 참여 신청 (2026-07-20)

**위치:** `apps/backend/src/api/store/group-deals/[id]/apply/route.ts`

**흐름:**

1. `AuthenticatedMedusaRequest` — 로그인 필수
2. Zod validate (`PostStoreApplyGroupDeal`)
3. `prepareGroupDealCheckoutWorkflow` — slot reserve + participant
4. `generateVirtualAccount({ hold_minutes: 5 })`
5. deal metadata에 `participant_application_details` 저장 (배송지, member_label)
6. Response — `participation`, `virtual_account`, deposit path

**미들웨어:** `api/store/group-deals/middlewares.ts` — apply route 인증 등록

**분석:** join route와 workflow를 공유하되, GB App APLY 폼 필드(배송지·멤버 라벨)를 metadata로 보존한다. `serializeAccountParticipation`이 metadata에서 `member_label`, `shipping_address`를 읽어 MYJN UI에 반영한다.

### 3.3 Join Route — v3 VA + Legacy Cart

**위치:** `apps/backend/src/api/store/group-deals/[id]/join/route.ts`

join과 apply 모두 VA + 5분 `payment_deadline` 경로를 기본으로 한다. 입금 확인은 `POST .../deposit-confirm` — **2026-07-20** 고객 소유 participant 검증 추가.

### 3.4 Group Deal Create — Validator & Field Mapping (2026-07-20)

**위치:** `apps/backend/src/api/store/me/group-deals/`

| 문제 | 해결 |
|------|------|
| `expected_ship_date` plain date 거부 | 프론트 `normalizeDraftDateToIsoDateTime()` |
| `member_seats`, `idol_group`, `goods_type` unrecognized | validator 확장 + route에서 options/metadata 매핑 |
| 데모 상품 없음 | `pnpm seed:group-buy-demo-product` |
| 모호한 오류 | `format-group-deal-validation-error.ts` |

**공유 상수:** `group-buying-demo-product.ts` — 데모 product handle/id

### 3.5 State Machine — `GroupDealStatus`

```typescript
export enum GroupDealStatus {
  DRAFT = "draft",
  OPEN = "open",                    // canonical "active recruiting"
  MINIMUM_REACHED = "minimum_reached",
  CLOSED = "closed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  SETTLED = "settled",
}
```

Store 노출: `OPEN`, `MINIMUM_REACHED`, `CLOSED` only (`group-deal-store.ts`).

### 3.6 Serialization Layer

**Store API (`group-deal-store.ts`):**

- `serializeStoreGroupDeal()` — idol_group, goods_type, timeline
- `serializeStoreGroupDealParticipant()` — payment_deadline, selections

**Account API (`group-deal-account.ts`):**

- `serializeAccountParticipation()` — MYJN stage, metadata shipping/member
- `resolveParticipationStage()` — 7단계 타임라인

### 3.7 Stub Integrations

| Stub | 파일 | 용도 |
|------|------|------|
| Virtual Account | `utils/virtual-account.ts` | VA 번호 생성 |
| Deposit confirm | `deposit-confirm/route.ts` | 입금 확인 (webhook 대체 전) |
| Document AI | `utils/document-extract-stub.ts` | 영수증 OCR |

### 3.8 API Route Import Path Convention

Medusa API route는 **파일 깊이에 따라** `modules/group-buying`까지의 상대 `../` count가 달라진다. 잘못된 depth는 startup crash를 유발한다.

| Route depth | `../` count | 예시 |
|-------------|-------------|------|
| `store/group-deals/[id]/apply/route.ts` | 6 | `../../../../../../modules/group-buying` |
| `store/me/group-deals/participations/[id]/review/route.ts` | 7 | `../../../../../../../modules/...` |

---

## 4. Storefront Code Analysis

### 4.1 Data Layer Pattern

**Server Actions (`"use server"`):**

| 파일 | 패턴 |
|------|------|
| `lib/data/group-deals.ts` | Medusa SDK → `/store/group-deals/*`, mock fallback (opt-in) |
| **`lib/data/group-deal-participation.ts`** | **`submitDealApplication`, `confirmVirtualAccountDeposit`, `cancelExpiredParticipation`** |
| `lib/data/account-group-deals.ts` | authed `/store/me/*` — hosted, participations, trust |
| `lib/data/cart.ts` | cart CRUD |
| `lib/data/flask-search.ts` | Flask HTTP (레거시 `/store` 전용) |

**Mock fallback 정책:** `lib/util/persistence-policy.ts`

```typescript
// NEXT_PUBLIC_ENABLE_MOCK_FALLBACK !== "true" 이면 mock 사용 안 함 (기본)
export const isMockFallbackEnabled = () =>
  process.env.NEXT_PUBLIC_ENABLE_MOCK_FALLBACK === "true"
```

apply/participation flow는 **기본적으로 실 API만** 사용한다. mock은 명시적 env에서만 fallback.

### 4.2 Navigation & Search Architecture (2026-07-20)

```
ProductSearch (nav / side-menu)
  └── handleSubmit
        └── buildGroupBuyingSearchPath(countryCode, query)
              └── /{countryCode}/group-buying?q={query}

GroupDealsCatalog (main SRCH)
  └── useGroupDealSearch()
        ├── draftFilters     ← sidebar typing
        ├── appliedFilters   ← URL-synced
        └── applySearch() → filtersToSearchParams → router.replace
```

**핵심 유틸:**

| 파일 | 역할 |
|------|------|
| `group-deal-filter-url.ts` | `parseFiltersFromSearchParams`, `filtersToSearchParams`, **`buildGroupBuyingSearchPath`** |
| `group-deal-filters.ts` | `GroupDealFilterState`, `filterGroupDeals()`, facets |
| `group-buying-filter-match.ts` | idol partial match, goods type alias (album→앨범 등) |
| `group-buying-catalog.ts` | `IDOL_GROUP_SUGGESTIONS`, `GOODS_TYPE_OPTIONS` |

**삭제됨 (KRW-only):**

- `currency-select/index.tsx`, `slot.tsx`
- `currency-options.ts`
- `nav.currencyAriaLabel` i18n keys

### 4.3 SRCH Filter UI (2026-07-20)

```
GroupDealsCatalog
├── SearchFilterBar          ← pill filters (idol, goods, price)
│     ├── searchable idol dropdown (partial match)
│     ├── goods type pills (앨범, 포토카드, 응원봉, MD 세트)
│     └── PriceRangeFilter   ← dual slider + min/max input
├── GroupDealFilters         ← legacy sidebar (draft/apply pattern)
└── CatalogResults (memo)    ← appliedFilters only
```

**필터 알고리즘 (`filterGroupDeals`):**

```typescript
// group-deal-filters.ts + group-buying-filter-match.ts
matchesQuery(deal, query)           // title, description, idol_group, member
matchesIdolGroupFilter(deal, group) // partial, case-insensitive
matchesGoodsTypeFilter(deal, goods) // alias map: photocard → 포토카드
matchesPriceRange(deal, min, max)   // deal_price bounds
```

**URL 쿼리 키:**

| Param | Filter field |
|-------|--------------|
| `q` | query |
| `group` | idolGroup |
| `goods` | goodsType |
| `minPrice` / `maxPrice` | price range |
| `sort` | sortBy (deadline \| newest) |

### 4.4 Participation Data Flow (2026-07-20)

```
deal-apply-form / deal-deposit-flow (client)
  └── group-deal-participation.ts (server actions)
        ├── submitDealApplication → POST /store/group-deals/:id/apply
        ├── confirmVirtualAccountDeposit → POST .../deposit-confirm
        └── cancelExpiredParticipation

MYJN list
  └── account-group-deals.ts
        └── listMyParticipations → GET /store/me/group-deals/participations
              └── returns response.participations ?? []  (empty array OK)
```

**이전 버그:** API가 `[]`를 반환하면 mock만 표시하고 실제 빈 목록을 숨김 → **수정됨**.

### 4.5 Flask Integration (Legacy Product Search)

Flask는 **`/store?q=`** 레거시 상품 카탈로그에만 사용된다. 공동구매 검색(`/group-buying`)은 Medusa group-deals + client filter.

```
paginated-products.tsx (/store)
  ├── isFlaskSearchEnabled() → false면 unavailable
  ├── searchProducts(query) → Flask IDs
  └── listProductsWithSort → Medusa hydrate

/group-buying
  └── listGroupDeals() + filterGroupDeals()  (no Flask)
```

### 4.6 GB App Architecture

#### Route Registry — `wireframe/routes.ts`

```typescript
export const gbAppRoutes = {
  home: (cc) => `/${cc}/home`,
  deal: (cc, dealId) => `/${cc}/deals/${dealId}`,
  dealApply: (cc, dealId) => `/${cc}/deals/${dealId}/apply`,
  dealDeposit: (cc, dealId) => `/${cc}/deals/${dealId}/deposit`,
  // ...
}
```

#### Deal Flow Components

| Wireframe | Component | Data source |
|-----------|-----------|-------------|
| DETL | `deal-detail-view/` | `getStoreGroupDeal` |
| APLY | `deal-apply-form/` | **`submitDealApplication`** |
| CHKO | `deal-deposit-flow/` | **`confirmVirtualAccountDeposit`** |
| MYJN | `participation-detail-view/` | `listMyParticipations` |

#### Mode Switching (Optimistic UI)

```typescript
// group-buying-mode-provider/
setModeState(next)                              // immediate paint
startTransition(() => router.push(...))
void setGroupBuyingMode(next).then(setModeState).catch(rollback)
```

### 4.7 Layout & Auth UI

| Component | 역할 |
|-----------|------|
| `nav/index.tsx` | logo, ProductSearch, 공동구매 link, language, cart (**no currency**) |
| `product-search/index.tsx` | **`buildGroupBuyingSearchPath`** on submit |
| `account/components/login/` | **`SubmitButton variant="primary"`** — purple CTA |
| `side-menu/index.tsx` | mobile menu, CountrySelect (shipping region, not currency) |

### 4.8 i18n Architecture

6개 로케일 (ko, en, ja, es, zh, ru). GB App·SRCH 라벨은 `dictionaries/ko.ts` → `groupBuying.*`.

**2026-07-20:** `nav.currencyAriaLabel` 제거 (통화 선택 UI 삭제). `groupDealCreateForm.currencyLabel`은 총대 개설 폼 read-only KRW 표시용으로 유지.

### 4.9 Type System

| Storefront type | Backend source |
|-----------------|----------------|
| `types/group-deal.ts` | `serializeStoreGroupDeal` |
| `types/account-group-deals.ts` | account + trust DTOs |
| `GroupDealFilterState` | `group-deal-filters.ts` |

---

## 5. Cross-Cutting Concerns

### 5.1 Authentication

| Context | Mechanism |
|---------|-----------|
| Store customer | Medusa session cookie → `getAuthHeaders()` |
| `/store/me/*`, apply | `AuthenticatedMedusaRequest` + middlewares |
| Admin | Medusa Admin JWT via `@medusajs/js-sdk` |

### 5.2 Caching

- Server Actions: `revalidateTag("group-deals")` on apply, preferences mutations
- Flask: `cache: "no-store"`
- Middleware regions: 1h TTL + dev 2s timeout

### 5.3 Payment Dual Path

```
                    POST /join  or  POST /apply
                        │
           ┌────────────┴────────────┐
           ▼                         ▼
    virtual_account path        cart_id path (legacy)
           │                         │
           ▼                         ▼
    /deposit page              /checkout (Toss/Stripe)
    (5min hold UI)             (해외, 현재 KRW-only 정책)
           │
           ▼
    POST deposit-confirm (customer ownership check)
           │
           ▼
    GET /store/me/group-deals/participations
```

### 5.4 Currency Policy (2026-07-20)

- **UI:** 통화 선택 컴포넌트 제거
- **API:** `currency_code: "krw"` 하드코딩 (create wizard, deposit, mock VA)
- **표시:** `Intl.NumberFormat("ko-KR")` + ₩ prefix
- **Region:** CountrySelect(side menu)는 배송 region용 — currency switch 아님

---

## 6. Key Algorithms

### 6.1 Group Deal Client Filter (SRCH)

```typescript
// useGroupDealSearch + filterGroupDeals
const filtered = filterGroupDeals(deals, appliedFilters)

// Idol: partial match on deal.idol_group, deal.title
matchesIdolGroupFilter(deal.idol_group, filter.idolGroup)

// Goods: alias normalization
normalizeGoodsTypeLabel("photocard") → "포토카드"

// Price: deal_price within [minPrice, maxPrice]
```

### 6.2 Header Search Path

```typescript
// group-deal-filter-url.ts
export const buildGroupBuyingSearchPath = (countryCode, query) =>
  trimmed ? `/${countryCode}/group-buying?q=${encodeURIComponent(trimmed)}`
          : `/${countryCode}/group-buying`
```

### 6.3 Participation Stage Resolution

```typescript
// group-deal-account.ts — priority:
delivery_confirmed_at → shipping → opening → purchasing → payment_complete → recruiting
```

### 6.4 Leader Trust Score (MTRS)

```typescript
trustScore = averageRating + completedBonus + onTimeBonus - disputePenalty - forfeiturePenalty
badge = resolveBadge(trustScore, completedDeals)
```

### 6.5 Date Normalization (Create Flow)

```typescript
// normalizeDraftDateToIsoDateTime.ts
// "2026-07-20" → "2026-07-20T00:00:00.000Z" (backend ISO datetime expectation)
```

---

## 7. Dependency Graph (Updated)

```
apply/route.ts
  ├── prepareGroupDealCheckoutWorkflow
  ├── generateVirtualAccount
  ├── serializeStoreGroupDealParticipant
  └── metadata.participant_application_details

group-deal-participation.ts
  ├── submitDealApplication → apply/route.ts
  └── confirmVirtualAccountDeposit → deposit-confirm/route.ts

product-search/index.tsx
  └── buildGroupBuyingSearchPath → group-buying/page.tsx

group-deals-catalog/
  ├── useGroupDealSearch (URL sync)
  ├── SearchFilterBar + PriceRangeFilter
  └── filterGroupDeals + group-buying-filter-match

account-group-deals.ts
  └── listMyParticipations → participations route (empty [] OK)

deal-apply-form / deal-deposit-flow
  └── group-deal-participation.ts (not group-deals.ts mock)
```

---

## 8. Code Quality Assessment

### 8.1 Strengths

| 항목 | 설명 |
|------|------|
| **Domain separation** | rules/utils pure functions + unit tests |
| **Hybrid isolation** | Flask failure doesn't break commerce |
| **Serialization layer** | API shape decoupled from ORM |
| **SRCH URL sync** | shareable filter state via query params |
| **Apply API wired** | GB App APLY → real backend (mock opt-in only) |
| **KRW-only simplification** | currency switch complexity removed |

### 8.2 Technical Debt

| 항목 | 심각도 | 설명 |
|------|--------|------|
| Reviews in metadata | Medium | MTRS — no normalized Review entity |
| Server-side seat hold | Medium | CHKO 5min hold client-only |
| VA webhook | Medium | deposit-confirm still stub |
| Client-side SRCH filter | Medium | No server pagination at scale |
| Dual route trees | Medium | `(main)/group-buying` + `(gb-app)/deals` parallel |
| API import depth | Medium | Manual `../` count |
| i18n partial locales | Low | GB card labels missing in ja/es/zh/ru |
| ~~GB App apply API mock~~ | ~~High~~ | **Resolved 2026-07-20** |
| ~~Currency selector~~ | ~~Low~~ | **Removed 2026-07-20** |

### 8.3 Test Coverage

| Area | Coverage |
|------|----------|
| Backend utils | 9+ spec files |
| Apply route | integration test TBD |
| Storefront filters | manual / no component tests |
| Participation flow | manual E2E recommended |

---

## 9. Security Notes

| Topic | Status |
|-------|--------|
| `/store/me/*` | Middleware auth — OK |
| `POST .../apply` | AuthenticatedMedusaRequest — OK |
| `deposit-confirm` | customer owns participant — OK (2026-07-20) |
| Leader-only APIs | leader_customer_id check |
| Flask BFF | No auth on `/api/ai/*` — rate limit TBD |
| Bank account | metadata masked |

---

## 10. Extension Guide

### 10.1 Add SRCH Server-Side Filter

1. Extend `GET /store/group-deals` query params (group, goods, minPrice)
2. Move `filterGroupDeals` logic to backend query builder
3. Keep URL param names in `group-deal-filter-url.ts` unchanged

### 10.2 Replace VA Stub with Real Bank API

1. Adapter in `utils/virtual-account.ts`
2. Webhook route for deposit confirmation (CHKO-02)
3. Keep apply/join response contract

### 10.3 Wire Document AI (Upstage)

```
leader-purchase-proof → group-deal-document-ai.ts → backend BFF
```

OCR from browser directly 금지.

### 10.4 New Store API Field

1. Model/metadata in `modules/group-buying/models`
2. `serializeStoreGroupDeal()` or account serializer
3. Mirror in `apps/storefront/src/types/`
4. Verify API route import depth

### 10.5 Frontend INP Checklist

1. Search inputs → `useDebouncedValue` (200ms)
2. List children → memo cards + `CatalogResults`
3. Server actions on click → optimistic + `startTransition`
4. Route renames → delete stale dynamic folders + restart dev

---

## 11. File Reference Index

### Backend — Critical Path

| File | 역할 |
|------|------|
| `modules/group-buying/service.ts` | Core domain |
| `utils/group-deal-store.ts` | Store serialization |
| `utils/group-deal-account.ts` | Account + MYJN serialization |
| `utils/format-group-deal-validation-error.ts` | Create validation messages |
| **`api/store/group-deals/[id]/apply/route.ts`** | **GB App apply (2026-07-20)** |
| `api/store/group-deals/[id]/join/route.ts` | Legacy join |
| `api/store/group-deals/[id]/deposit-confirm/route.ts` | VA confirm + ownership |
| `api/store/me/group-deals/route.ts` | Hosted create + field mapping |
| `scripts/seed-group-buy-demo-product.ts` | Demo product for create wizard |
| `jobs/group-deal-maintenance.ts` | Cron |

### Storefront — Critical Path

| File | 역할 |
|------|------|
| **`lib/util/group-deal-filter-url.ts`** | **URL filters + buildGroupBuyingSearchPath** |
| **`lib/util/group-buying-filter-match.ts`** | **Idol/goods match + aliases** |
| **`lib/data/group-deal-participation.ts`** | **Apply/deposit server actions** |
| `lib/util/normalize-draft-date-to-iso-datetime.ts` | Create date fix |
| `lib/constants/group-buying-catalog.ts` | Idol/goods suggestions |
| **`modules/layout/components/product-search/`** | **Header search → group-buying** |
| **`modules/group-buying/components/search-filter-bar/`** | **SRCH pill filters** |
| **`modules/group-buying/components/price-range-filter/`** | **Price slider + input** |
| `modules/group-buying/hooks/use-group-deal-search.ts` | URL-synced filter state |
| `modules/group-buying/components/group-deals-catalog/` | Catalog + CatalogResults |
| `modules/group-buying/components/deal-apply-form/` | APLY form |
| `modules/group-buying/components/deal-deposit-flow/` | CHKO flow |
| `modules/account/components/login/` | Login (primary button) |
| `lib/wireframe/routes.ts` | GB App URL registry |

---

## 12. v3 Spec Mapping (Code Level)

| ID | Status | Primary implementation |
|----|--------|------------------------|
| **SRCH (main)** | **Done (2026-07-20)** | `search-filter-bar`, URL sync, header search → `/group-buying` |
| **APLY/CHKO API** | **Partial → Improved** | `apply/route.ts`, `group-deal-participation.ts` |
| **MYJN list** | **Fixed (2026-07-20)** | `listMyParticipations` empty array |
| GB DETL→DONE | Frontend done | `deal-*` components + apply API |
| CHKO-02 | Stub | VA webhook 미구현 |
| CHKO-03 (server) | Missing | client-only 5min hold |
| MTRS-01 | Done | leader-trust-profile |
| DASH-05 | Partial | price-rec; refund automation missing |
| HOME-03 | Done | landing-deals + AI slider |
| Flask `/store` | Optional | legacy product search only |

---

## 13. Conclusion

코드베이스는 **Medusa module + workflow + pure utils** 패턴을 따르며, v3 공동구매 도메인과 GB App UI를 **serialization 확장 + server actions**으로 연결했다.

**2026-07-20 정리:**

- 메인 쇼핑 UX는 **`/group-buying` 중심**으로 통합 — 헤더 검색·공동구매 nav·SRCH 필터가 동일 카탈로그를 사용
- **KRW-only** — 통화 선택 UI·유틸 제거로 프론트 복잡도 감소
- **참여 flow** — apply API + server actions + MYJN 목록 버그 수정으로 deposit 이후 참여 관리가 실 API와 연동
- **총대 개설** — validator/날짜/데모 시드로 create wizard 안정화

**우선 리팩터링 후보:**

1. Server-side SRCH pagination/filter API
2. CHKO seat hold + VA webhook (CHKO-02/03)
3. Route tree consolidation — `(main)/group-buying` vs `(gb-app)/deals`
4. Review/Dispute metadata → 정규화 엔티티
5. API route import path alias
6. Storefront integration tests: apply → deposit → MYJN list

---

*본 문서는 2026-07-20 시점 코드베이스 정적 분석 결과입니다.*
