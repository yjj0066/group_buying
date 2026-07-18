# Group Buying Site — Code Analysis

> **작성 기준일:** 2026-07-18 (최초 2026-07-15)  
> **대상:** `group-buying-site/` monorepo (`@dtc/backend` + `@dtc/storefront`)  
> **관련 문서:** [README.md](./README.md) · [PROJECT_STATUS.md](./PROJECT_STATUS.md) · [docs/api-contract-for-merge.md](./docs/api-contract-for-merge.md)

---

## 1. Executive Summary

본 프로젝트는 **Medusa v2 커스텀 모듈** 위에 공동구매 도메인을 올리고, **Next.js App Router** 스토어프론트와 **Flask 하이브리드 AI**를 분리 연동한 3-tier 구조이다.

| 레이어 | 역할 | Source of Truth |
|--------|------|-----------------|
| **Medusa Backend** | 주문·결제·재고·공구 CRUD·워크플로·정산·신뢰 집계 | PostgreSQL |
| **Next.js Storefront** | UI·i18n·BFF·Server Actions | Medusa Store API + Flask BFF |
| **Flask (Practice)** | 검색·추천·행동 로그·임베딩 | Flask PostgreSQL (SearchDocument) |

**핵심 설계 원칙:**

1. **결제/주문은 Medusa만** — Flask는 commerce path에 끼지 않음
2. **실패 격리** — Flask/로그 실패가 장바구니·결제 UX를 차단하지 않음
3. **직렬화 계층 분리** — DB 모델 → `group-deal-store.ts` / `group-deal-account.ts` → Storefront types
4. **v3 이중 결제** — PG 에스크로 경로와 가상계좌(VA) 경로가 join route에서 분기
5. **Pure function 집계** — 신뢰·단가 추천은 DB 컬럼 없이 metadata + utils에서 계산

**2026-07-15 기준 주요 추가:**

| 스펙 | 구현 | 핵심 파일 |
|------|------|-----------|
| **HOME-03** | 최애 아이돌 기반 랜딩 정렬 + Flask `deadline_popularity` 추천 | `landing-deals.ts`, `ai-engine.ts` |
| **DASH-05** | 멤버 옵션별 AI 단가 추천·일괄 적용 | `group-deal-price-recommendations.ts`, `apply-price-recommendations/route.ts` |
| **MTRS-01** | 총대 신뢰 프로필·후기·신고 | `leader-trust-profile.ts`, `trust-profile/route.ts` |
| **HOME-01** | 로그인 역할별 redirect | `(landing)/page.tsx` |
| **MYJN-07** | D+7 자동 수령 확인 | `service.autoConfirmOverdueDeliveries`, cron job |
| **Dev perf** | Flask dev OFF, 800ms timeout, Turbopack, landing fetch dedup | `flask-search.ts`, `middleware.ts` |

**2026-07-18 기준 주요 추가:**

| 영역 | 구현 | 핵심 파일 |
|------|------|-----------|
| **GB App UI** | `(gb-app)` 라우트 그룹 — 참여자 7단계·총대 10단계·마이 9화면 | `wireframe/routes.ts`, `(gb-app)/**/page.tsx` |
| **모드 전환** | participant/leader cookie + optimistic UI | `group-buying-mode-provider/`, `group-buying-mode.ts` |
| **온보딩** | splash → login → signup → bank-account → home | `gb-app-auth-flow.ts` |
| **INP 최적화** | debounce 200ms, React.memo 카드, 카탈로그 결과 분리 | `use-debounced-value.ts`, `group-deal-card-list/` |
| **라우트 수정** | stale `[id]` vs `[participantId]` 충돌 제거 | `(gb-app)/my/participations/[participantId]/` |
| **import 수정** | `leader-settlement-view` 상대 경로 | `leader-settlement-view/index.tsx` |

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
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ utils: rules · store · account · leader-trust · price-rec       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
         │ search-index feed                    ▲
         ▼                                        │ events / search / recommendations
┌─────────────────────────────────────────────────────────────────────────┐
│                    Flask AI Engine (:5000) — optional in dev             │
│  SearchDocument · Embedding · SearchLog · Recommendations                │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Route Groups (Storefront)

| Group | 경로 | 렌더링 |
|-------|------|--------|
| `(landing)` | `/kr` | RSC + 역할 redirect + AI slider |
| **`(gb-app)`** | **`/home`, `/deals/*`, `/seller/*`, `/my/*`, `/auth/*`** | **RSC gate + client islands + tab bar layout** |
| `(main)` | `/store`, `/group-buying`, `/account`, `/products` | RSC + client islands (레거시) |
| `(checkout)` | `/cart`, `/checkout` | client-heavy PG widgets |
| `app/api/ai` | BFF | Route Handlers (no UI) |

**GB App vs 레거시 `(main)`:**

- **목록/검색:** `/kr/group-buying` (레거시) ↔ `/kr/home`, `/kr/search` (GB App)
- **상세/입금:** `/kr/group-buying/[id]` ↔ `/kr/deals/[dealId]`
- **마이:** `/kr/account/*` ↔ `/kr/my/*`
- **총대:** `/kr/account/group-deals/hosted/[id]` ↔ `/kr/seller/deals/[dealId]/*`

동적 세그먼트 규칙: participations 경로는 **`[participantId]`만** 사용. 같은 depth에 `[id]`와 `[participantId]` 공존 시 Next.js App Router가 startup/compile 단계에서 거부한다.

### 2.2 Dev Performance Defaults

로컬 개발에서 Flask 미기동·백엔드 지연으로 인한 **체감 속도 저하**를 줄이기 위한 설정이다.

| 설정 | 파일 | dev 기본 | prod 기본 |
|------|------|----------|-----------|
| Flask 활성화 | `lib/config/flask-search.ts` | **OFF** (`SEARCH_API_ENABLED` 미설정) | URL 있으면 ON |
| Flask 타임아웃 | `getFlaskRequestTimeoutMs()` | **800ms** | 2500ms |
| Region fetch | `middleware.ts` | **2s** abort | 5s |
| Next dev bundler | `storefront/package.json` | **Turbopack** | — |
| Landing preferences | `(landing)/page.tsx` → template | 비로그인 시 **skip** | — |
| **GB App search debounce** | `use-debounced-value.ts` | **200ms** | — |
| **Card memoization** | `GroupDealCard`, `BbGroupBuyCard`, `GroupDealCardList` | **React.memo** | — |
| **Mode switch** | `group-buying-mode-provider` | **optimistic UI** (server action background) | — |

**분석:** `isFlaskSearchEnabled()`는 dev에서 명시적 `SEARCH_API_ENABLED=true` 없이는 Flask HTTP를 호출하지 않는다. 이로 인해 RSC 페이지가 Flask `:5000` connection refused를 기다리지 않는다. production에서는 `NEXT_PUBLIC_SEARCH_API_URL` 또는 `AI_ENGINE_URL`만으로 활성화된다.

**2026-07-18 INP 분석:** GB App 검색·필터는 client-side `filterGroupDeals()`를 매 keystroke마다 실행하면서 `BbGroupBuyCard`(trust 계산, member chips, progress) 전체를 re-render했다. debounce + memo + catalog 결과 분리로 **입력 핸들러와 카드 트리를 decouple**했다. 모드 전환은 `await setGroupBuyingMode()`가 클릭 핸들러를 block하던 anti-pattern — optimistic `setModeState` 후 `startTransition` + background sync로 교체.

**주의:** Performance 탭에서 `tiptap.ProseMirror.ui-prompt-input-editor__input` 지연은 **Cursor IDE** UI이며 storefront 코드 경로가 아니다.

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
| Rules | `utils/group-deal-rules.ts` | joinable 검증, status evaluation, participant count |
| Options | `utils/group-deal-options.ts` | selection limit, 1차금 계산 |
| Admin rules | `utils/group-deal-admin-rules.ts` | deposit guard, status transition guard |
| Store serialize | `utils/group-deal-store.ts` | Store API DTO, timeline stage |
| Account serialize | `utils/group-deal-account.ts` | My page DTO, participation stage, settlements |
| Leader trust | `utils/leader-trust-profile.ts` | MTRS — trust score, badge, reviews aggregate |
| Price rec | `utils/group-deal-price-recommendations.ts` | DASH — fill rate, vacancy risk, recommended price |
| Leader stats | `utils/group-deal-leader-stats.ts` | DETL — `leader_role_number`, `is_first_time_leader` |

**분석:** 비즈니스 규칙이 service 메서드 내부가 아닌 `utils/` pure function으로 분리되어 unit test 가능 (`__tests__/` 9개 spec). MTRS·DASH는 **별도 테이블 없이** deal metadata(`leader_reviews`, `disputes`)와 option quantity에서 집계한다.

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

**정합성 작업:** 과거 `ACTIVE` 문자열 참조를 백엔드 cron·store filter·스토어프론트 type union에서 `OPEN`으로 통일. `landing-deals.ts`의 open filter에는 legacy `"active"`가 아직 포함되어 있어 API 응답 호환용으로만 남아 있다.

### 3.3 Join Route — v3 VA + Legacy Cart

**위치:** `apps/backend/src/api/store/group-deals/[id]/join/route.ts`

**흐름:**

1. Zod validate (`PostStoreJoinGroupDeal`)
2. `prepareGroupDealCheckoutWorkflow` — slot reserve + cart/participant
3. `generateVirtualAccount({ hold_minutes: 5 })` — VA stub
4. `updateGroupDeals` metadata — `participant_virtual_accounts`, `payment_model: virtual_account`
5. Response — `virtual_account`, `checkout_path: /group-buying/{id}/deposit?participant=...`

**분석:** workflow는 cart 기반 PG 경로도 지원하지만, join route가 VA metadata를 덮어써 v3 기본 UX는 deposit 페이지로 유도한다. 입금 확인은 `POST .../deposit-confirm` stub.

### 3.4 Serialization Layer

**Store API (`group-deal-store.ts`):**

- `serializeStoreGroupDeal()` — idol_group, goods_type, timeline, receipt fields
- `resolveStoreDealTimelineStage()` — 7단계: created → recruiting → payment → purchasing → **opening** → shipping → settlement
- `serializeStoreGroupDealParticipant()` — payment_deadline, selections

**Account API (`group-deal-account.ts`):**

- `resolveParticipationStage()` — MYJN 타임라인 (opening 포함)
- `resolveLeaderStage()` — 총대 hosted deals
- `readGroupBuyingPreferences()` — `preferred_role: participant | leader`
- `buildSettlementRecords()` — MSTL 정산 DTO

### 3.5 P2 — Leader Trust Profile (MTRS-01)

**위치:** `apps/backend/src/utils/leader-trust-profile.ts`

**입력:** 총대가 hosted한 `GroupDeal[]` (metadata 포함)

**출력:** `LeaderTrustProfile`

```typescript
{
  trust_score: number          // 1–5, review avg + bonus/penalty
  badge: "platinum" | "gold" | "silver" | "bronze" | "newcomer"
  breakdown: {
    completed_deals, average_rating, review_count,
    on_time_rate, dispute_count, deposit_forfeiture_count
  }
  reviews: LeaderReviewRecord[]
  rating_distribution: { "1".."5": number }
}
```

**알고리즘:**

1. `metadata.leader_reviews[]`에서 후기 수집 → rating distribution
2. `status === "settled"` → completed_deals, `metadata.delivered_on_time` → on_time_rate
3. `deposit_status === "forfeited"` → deposit_forfeiture_count
4. `metadata.disputes[]` length → dispute_count
5. trust_score = avg_rating + completed bonus + on-time bonus − dispute/forfeiture penalty
6. badge = score × completed_deals threshold matrix

**API:**

| Method | 경로 | 역할 |
|--------|------|------|
| GET | `/store/me/trust-profile` | `buildLeaderTrustProfile(hostedDeals)` |
| POST | `/store/me/trust-profile/reviews/:reviewId/report` | review metadata에 `reported: true` |

**후기 저장:** `POST .../participations/:id/review` → deal `metadata.leader_reviews[]` append (participant ownership 검증)

**분석:** 정규화된 Review 엔티티 없음 — MVP는 deal metadata 배열. scale 시 별도 module 또는 link table로 이전 필요.

### 3.6 P2 — AI Price Recommendations (DASH-05)

**위치:** `apps/backend/src/utils/group-deal-price-recommendations.ts`

**알고리즘 (rule-based, Flask 미사용):**

```
fill_rate = current_quantity / max_quantity
vacancy_risk = high (<40%) | medium (<70%) | low
discount = 10% | 5% | 0%
recommended = roundDownToHundred(current × (1 - discount))
floor = roundDownToHundred(current × 0.7)   // 최대 30% 인하
```

**API:**

| Method | 경로 | 역할 |
|--------|------|------|
| GET | `/store/me/group-deals/:id/price-recommendations` | leader ownership + `buildOptionPriceRecommendations` |
| POST | `/store/me/group-deals/:id/apply-price-recommendations` | `assertPriceDecreaseOnly` — **모집 중 인상 불가** |

**apply route guard:**

- `ALLOWED_STATUSES`: `OPEN`, `MINIMUM_REACHED` only
- leader_customer_id === auth actor
- option별 `deal_price` update via `GroupBuyingModuleService.updateDealOptions`

**미구현:** 가격 인하 시 기존 participant 환불/차액 정산 자동화 (DASH-05 후속)

### 3.7 D+7 Auto Delivery Confirm (MYJN-07)

**위치:** `service.autoConfirmOverdueDeliveries()` + `jobs/group-deal-maintenance.ts`

```typescript
// 매시간 cron (0 * * * *)
for (participant of CONFIRMED participants) {
  if (delivery_confirmed_at) skip
  if (!tracking_updated_at) skip
  if (now - tracking_updated_at < 7 days) skip
  if (open dispute for participant) skip
  await confirmParticipantDelivery(participant.id)
}
```

**분석:** OPEN-04 스펙의 D+7 자동확인을 cron + service method로 구현. 분쟁(`metadata.participant_disputes` status `open`)이 있으면 skip.

### 3.8 Stub Integrations (v3 Placeholders)

| Stub | 파일 | 용도 |
|------|------|------|
| Virtual Account | `utils/virtual-account.ts` | VA 번호 생성, expires_at |
| Deposit confirm | `api/store/group-deals/[id]/deposit-confirm/route.ts` | 입금 확인 stub |
| Document AI | `utils/document-extract-stub.ts` | 영수증 OCR → structured fields |
| Admin receipt | `api/admin/group-deals/[id]/receipt/route.ts` | upload → extract → auto-verify |

production adapter 교체 지점 — interface는 route/service에 고정, implementation만 swap.

### 3.9 Admin Extension

**SDK 패턴:**

```
admin/lib/sdk.ts          → Medusa JS SDK singleton (__BACKEND_URL__)
admin/lib/admin-fetch.ts  → sdk.client.fetch wrapper (JWT 자동)
```

raw `fetch` + cookie는 Admin SPA에서 401 발생 → SDK가 session JWT를 `/admin/*` 요청에 첨부.

### 3.10 Workflows & Events

| Workflow | Trigger | Effect |
|----------|---------|--------|
| `prepareGroupDealCheckoutWorkflow` | POST join | participant PENDING, cart |
| `captureGroupDealPaymentsWorkflow` | minimum_reached event | PG batch capture |
| `processOverdueParticipantsWorkflow` | cron | slot vacate |
| `confirmParticipantDeliveryWorkflow` | POST confirm-delivery | SETTLED path |
| `recordLeaderDepositWorkflow` | POST leader deposit | deposit_status update |

### 3.11 API Route Import Path Convention

Medusa API route는 **파일 깊이에 따라** `modules/group-buying`까지의 상대 경로가 달라진다. 잘못된 depth는 **백엔드 startup crash** (`Cannot find module`)를 유발한다.

| Route depth (from `src/api/`) | `../` count | 예시 |
|-------------------------------|-------------|------|
| `store/me/trust-profile/route.ts` | 4 | `../../../../modules/group-buying` |
| `store/me/group-deals/hosted/route.ts` | 5 | `../../../../../modules/...` |
| `store/me/group-deals/[id]/deposit/route.ts` | 6 | `../../../../../../modules/...` |
| `store/me/group-deals/participations/[id]/review/route.ts` | 7 | `../../../../../../../modules/...` |

**규칙:** `route.ts`가 있는 디렉터리에서 `src/`까지 올라간 뒤 `modules/group-buying`을 붙인다.

---

## 4. Storefront Code Analysis

### 4.1 Data Layer Pattern

**Server Actions (`"use server"`):**

| 파일 | 패턴 |
|------|------|
| `lib/data/group-deals.ts` | Medusa SDK → `/store/group-deals/*` |
| `lib/data/cart.ts` | cart CRUD, `addToCart`, `placeOrder` |
| `lib/data/account-group-deals.ts` | authed `/store/me/*` — bank, review, dispute, trust, price-rec |
| `lib/data/flask-search.ts` | Flask HTTP (`getFlaskRequestTimeoutMs`) |
| `lib/data/ai-engine.ts` | recommendations + health check |
| `lib/data/flask-behavior-log.ts` | Flask event forward (swallow errors) |

**Client utilities (no server):**

| 파일 | 패턴 |
|------|------|
| `lib/util/flask-behavior-log.ts` | `void fetch().catch()` fire-and-forget |
| `lib/util/landing-deals.ts` | API → LandingCard mapper + idol prioritize + MOCK fallback |
| `lib/util/group-deal-filters.ts` | pure filter on in-memory deals |
| `lib/util/group-deal-trust.ts` | client-side trust heuristic + leader flags |

### 4.2 Flask Integration Architecture

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│ Client Component │────▶│ /api/ai/* (BFF)     │────▶│ Flask :5000  │
│ (slider, track*) │     │ Route Handler       │     │ (if enabled) │
└──────────────────┘     └─────────────────────┘     └──────────────┘
┌──────────────────┐     ┌─────────────────────┐
│ RSC (paginated-  │────▶│ flask-search.ts     │────▶ Flask (direct)
│  products)       │     │ isFlaskSearchEnabled│
└──────────────────┘     └─────────────────────┘
```

**검색 (`paginated-products.tsx`):**

1. `isFlaskSearchEnabled()` → false면 unavailable UI
2. `searchProducts(query)` → Flask IDs + synonym meta
3. `listProductsWithSort({ id: productIds })` — Medusa hydrate
4. `orderProductsByIds()` — Flask ranking preserved
5. Medusa `q=` fallback **없음**

**추천 (`ai-recommendation-slider/index.tsx`):**

- Client `useEffect` → `GET /api/ai/recommendations?context=landing|similar`
- landing context: `policy=deadline_popularity`, `favorite_idol_group` (HOME-03)
- BFF → `getRecommendationsViaAiEngine` → hydrate products + `group_deal_ids`
- Empty → `null` render

**행동 로그 (3-layer safety):**

```typescript
// Layer 1: Client — never throws
void fetch("/api/ai/events", { keepalive: true }).catch(() => {})

// Layer 2: BFF — always 202
catch { /* swallow */ }

// Layer 3: Server forward — try/catch, getFlaskRequestTimeoutMs()
await forwardFlaskBehaviorEvent(event)
```

### 4.3 HOME-01 / HOME-03 — Landing Flow

**HOME-01 — 역할별 redirect** (`(landing)/page.tsx`):

```typescript
if (customer) {
  const preferences = await retrieveGroupBuyingPreferences()
  if (preferences.preferred_role === "leader")
    redirect(`/${countryCode}/account/group-deals/hosted`)
  redirect(`/${countryCode}/group-buying`)
}
// else → LandingPageTemplate
```

**HOME-03 — 최애 아이돌 우선** (`landing-deals.ts` + `landing-page/index.tsx`):

1. `(landing)/page.tsx`가 `retrieveCustomer()` 후 `initialCustomer`를 template에 전달
2. template은 `initialCustomer` 있을 때만 `retrieveGroupBuyingPreferences()` 호출 (비로그인 skip)
3. `getLandingHomeData({ favoriteIdolGroup })` → `prioritizeByIdol()` — groupName match sort
4. `AiRecommendationSlider`에 `favoriteIdolGroup` + Flask `favorite_idol_group` query param

**Mock fallback:** API에 open deal 없으면 `MOCK_DEALS` 6건 — dev/demo용, production seed 필요.

### 4.4 Component Composition

**DETL (Group Deal Detail):**

```
GroupDealDetailTemplate (RSC)
├── LeaderTrustPanel — first-time vs experienced (DETL/TRST)
├── GroupDealTimeline — 7 stages
├── PurchaseReceiptPanel — structured fields
├── DealJoinSection → MemberSeatPicker → JoinDealForm → /deposit
└── AiRecommendationSlider — similar products
```

**DASH (Hosted Deal Dashboard):**

```
HostedDealDashboardPage (RSC)
├── fill rate, days left, vacant seats (computed)
├── member option breakdown
└── AiPriceRecommendationPanel (client)
      ├── GET price-recommendations (RSC prefetch)
      └── POST apply-price-recommendations (client applyAll)
```

**MTRS (Trust & Reviews):**

```
TrustReviewsPage (RSC)
└── TrustProfilePanel (client)
      ├── trust score, badge, breakdown
      ├── rating distribution
      ├── review list
      └── reportLeaderReview → POST .../report
```

**MYJN (Account):**

```
ParticipationsList → ParticipationTimeline (opening stage)
ParticipationDetail → ReviewForm, DisputeForm
RoleSwitcher → PUT /store/me/preferences { preferred_role }
BankAccountForm → POST /store/me/bank-account
SettlementsTable → GET /store/me/group-deals/settlements
```

### 4.5 Type System (Storefront)

| Storefront type | Backend source |
|-----------------|----------------|
| `types/group-deal.ts` | `serializeStoreGroupDeal` shape |
| `types/account-group-deals.ts` | account + trust + price recommendation DTOs |
| `types/flask-search.ts` | Flask API contract |
| `types/ai-engine.ts` | recommendation context, health |
| `types/landing-deal.ts` | `landing-deals.ts` mapper |

**Gap:** Storefront `GroupDealStatus` union과 backend enum은 mirror 관계 — API 변경 시 수동 sync.

### 4.6 i18n Architecture

6개 로케일 (ko, en, ja, es, zh, ru). MTRS·DASH 라벨은 `dictionaries/ko.ts` → `account.trustReviews`, `account.hostedDeals.dashboard` 등.

**Gap (2026-07-18):** `cardDaysHoursLeft`, `cardClosedOverlay` 등 GB App 카드 라벨은 ko/en만 완비 — ja/es/zh/ru는 `cardEndsToday`만 있어 해당 locale에서 runtime error 가능. ko 기본 dev 환경에서는 문제 없음.

### 4.7 GB App Architecture (2026-07-18)

#### 4.7.1 Route Registry — `wireframe/routes.ts`

단일 source of truth for GB App URL 생성:

```typescript
export const gbAppRoutes = {
  home: (cc) => `/${cc}/home`,
  deal: (cc, dealId) => `/${cc}/deals/${dealId}`,
  participationDetail: (cc, participantId) => `/${cc}/participations/${participantId}`,
  sellerSettlement: (cc, dealId) => `/${cc}/seller/deals/${dealId}/settlement`,
  // ...
}
```

하단 탭: `GB_TAB_CONFIG`, `getGbTabItems(mode)`, `isMyFlowTabRoute()`. participant 모드(홈·검색·참여·마이) vs leader 모드(홈·검색·개설·내 공구·마이) 분기.

#### 4.7.2 Layout Shell — `(gb-app)/layout.tsx`

```
GbAppLayout (RSC)
├── getServerDictionary()
├── getGroupBuyingMode()          // cookie → preferences fallback
├── retrieveCustomer()
└── I18nProvider
    └── GroupBuyingModeProvider   // client: mode state + setMode
        ├── GbWebNav
        ├── GbWebShell → {children}
        └── GbAppTabBar             // useGroupBuyingMode + pathname hide rules
```

`HIDE_TAB_PREFIXES`: splash, auth/*, deals/*, seller/deals/* 등에서 탭 바 숨김.

#### 4.7.3 Auth & Onboarding Gate

**파일:** `lib/data/gb-app-auth-flow.ts`, `lib/data/group-deal-pages.ts`

```
GET /kr/home
  ├── resolveGbAppOnboardingRedirect()
  │     └── no favorite_idol_group → redirect /auth/signup
  ├── requireCustomerForGbApp()     // no session → /auth/login
  ├── loadHomeDashboardData()       // listGroupDeals + hostedDeals
  └── retrieveGroupBuyingPreferences()
        └── HomeModeDashboard (client)
```

온boarding 완료 조건: `isGbAppOnboardingComplete(metadata)` **또는** `preferences.favorite_idol_group` 존재.

회원가입 flow: `signupGbAppUser` → preferences 저장 → redirect `bankAccount` → `saveGbAppBankAccount` → home.

#### 4.7.4 Participant Browse — `participant-home-browse/`

Client component. 상태:

| State | 용도 | Re-render scope |
|-------|------|-----------------|
| `query` (immediate) | input value | search input only |
| `debouncedQuery` (200ms) | `filterGroupDeals` | filtered list |
| `statusTab` | all / in_progress / closed | filtered list |
| `selectedIdols` | chip multi-select | filtered list |

**최적화 전:** `onChange → setQuery → filter → map(GroupDealCard)` 매 keystroke.  
**최적화 후:** debounced filter + `GroupDealCardList` (memo) + `BbGroupBuyCard` (memo).

#### 4.7.5 Mode Switching — Anti-pattern Fix

**Before (blocking ~1–2s INP):**

```typescript
const updated = await setGroupBuyingMode(next)  // server action: cookie + PUT preferences
setModeState(updated)
startTransition(() => router.push(...))
```

**After (optimistic):**

```typescript
setModeState(next)                              // immediate paint
startTransition(() => router.push(...))         // navigation in transition
void setGroupBuyingMode(next).then(setModeState).catch(() => rollback)
```

`setGroupBuyingMode` (`"use server"`)는 cookie 설정 + `updateGroupBuyingPreferences({ preferred_role })`. 네트워크 완료를 UI thread에서 await하지 않는다.

#### 4.7.6 Catalog Split — `group-deals-catalog/`

```
GroupDealsCatalog
├── useGroupDealSearch()
│     ├── draftFilters    ← filter sidebar typing (no list impact)
│     └── appliedFilters  ← URL-synced, drives list
├── GroupDealFilters (draft)
└── CatalogResults (memo) ← only re-renders when appliedFilters / deals change
      └── GroupDealCardList (memo)
```

필터 검색어는 sidebar에서 `draftFilters`만 갱신 — **Apply/Submit 전까지** 결과 memo skip.

#### 4.7.7 Deal Flow Components (Client Islands)

| Wireframe | Component | Data |
|-----------|-----------|------|
| DETL | `deal-detail-view/` | `getStoreGroupDeal`, product image enrich |
| APLY | `deal-apply-form/` | shipping, refund bank, Daum postcode |
| CHKO | `deal-deposit-flow/` | 5min timer, VA copy, expired redirect |
| DONE | `deal-complete-view/` | summary + dual CTAs |
| MYJN | `participation-detail-view/` | 5-stage stepper |
| RPTB | `participant-review-form/` | confirm delivery + star review |

**Backend gap:** `POST /store/group-deals/:id/apply` 미연동 — `group-deals.ts` mock fallback. quantity·seat hold는 클라이언트 stub.

#### 4.7.8 Leader Flow Components

| Step | Component | Storage |
|------|-----------|---------|
| Create wizard | `seller-create-*` pages | `sessionStorage` key `gb-leader-create-wizard-draft` |
| Dashboard | `leader-deal-dashboard/` | hosted deal runtime |
| Recruitment | `leader-recruitment-view/` | close-recruitment API (partial) |
| Purchase proof | `leader-purchase-proof/` | OCR via `parseGroupDealReceiptDocument` (stub) |
| Settlement | `leader-settlement-view/` | `leader-settlement/storage.ts` per dealId |

**Import fix (2026-07-18):** `leader-settlement-view/index.tsx`가 `./bank-account-edit-modal` 등 잘못된 경로 → `../leader-settlement/*`. Turbopack compile failure 시 **전체 dev server 500** (하얀 화면).

#### 4.7.9 Dynamic Route Incident — `[id]` vs `[participantId]`

```
my/participations/
├── [id]/review/          ← stale empty folder (삭제됨)
└── [participantId]/
    ├── page.tsx          ← redirect to /participations/[participantId]
    └── review/page.tsx
```

Next.js error: *"You cannot use different slug names for the same dynamic path"*. `[id]` 폴더에 `page.tsx` 없이 `review/`만 있어 glob 탐색에서 누락되기 쉬움. **라우트 구조 변경 후 dev server 재시작 필수** — stale Turbopack state는 모든 경로 500 유발.

#### 4.7.10 Shared Design System — `modules/design-system/`

| Component | Role | Perf note |
|-----------|------|-----------|
| `BbGroupBuyCard` | 카드 UI + trust + progress + link | memoized |
| `BbSearchInput` | search icon + Enter handler | controlled input |
| `BbTabs`, `BbChip` | catalog filters | click → parent filter state |
| `BbToggle` | participant/leader switch | triggers setMode |
| `BbKpiGrid` | leader dashboard KPIs | — |

Trust 표시: `calculateLeaderTrustScore()` (client) + `LeaderTrustPanel` / `getLeaderRoleNumber()` — DETL duplicate message bug fix (첫 공구 + N번째 동시 표시 방지).

---

## 5. Cross-Cutting Concerns

### 5.1 Authentication

| Context | Mechanism |
|---------|-----------|
| Store customer | Medusa session cookie → `getAuthHeaders()` in Server Actions |
| `/store/me/*` | `api/store/me/middlewares.ts` — `auth_context.actor_id` |
| Admin | Medusa Admin JWT via `@medusajs/js-sdk` |
| Flask | Optional `customer_id`, `favorite_idol_group` query params |

### 5.2 Caching

- Server Actions: `revalidateTag("group-deals")` on price apply, preferences mutations
- RSC products: `cache: "force-cache"` + tags in production
- Flask calls: `cache: "no-store"` (always fresh)
- Middleware regions: 1h TTL + dev 2s fetch timeout + fallback map

### 5.3 Error Handling

| Layer | Pattern |
|-------|---------|
| Medusa API | `medusaError()` wrapper → throw with message |
| Flask | return `null`, console.warn — degrade gracefully |
| Admin fetch | FetchError → user-friendly Korean message |
| Behavior log | silent swallow at all layers |
| Trust profile | `retrieveLeaderTrustProfile()` catch → null → notFound |

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
    stub deposit-confirm       /order/confirmed
    + behavior log             + behavior log
           │                         │
           └────────────┬────────────┘
                        ▼
              confirm-delivery (manual or D+7 cron)
                        ▼
                   settlements API
```

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

### 6.3 Leader Trust Score (MTRS)

```typescript
// leader-trust-profile.ts
trustScore = reviewCount > 0 ? averageRating : 3
if (completedDeals >= 3) trustScore += 0.3
if (onTimeRate >= 0.9) trustScore += 0.2
trustScore -= min(1, disputeCount * 0.2)
trustScore -= depositForfeitureCount * 0.5
badge = resolveBadge(trustScore, completedDeals)
```

Backend count가 source of truth. DETL `LeaderTrustPanel`은 `leader_role_number` / `is_first_time_leader`를 별도 표시.

### 6.4 Price Recommendation (DASH)

```typescript
fillRate = current_quantity / max_quantity
risk = fillRate < 0.4 ? "high" : fillRate < 0.7 ? "medium" : "low"
discount = { high: 0.10, medium: 0.05, low: 0 }[risk]
recommended = max(floor, roundDown(current * (1 - discount)))
assertPriceDecreaseOnly({ currentPrice, nextPrice })  // apply 시
```

### 6.5 Landing Idol Prioritization (HOME-03)

```typescript
// landing-deals.ts — stable sort, match groupName contains favoriteIdolGroup
cards.sort((a, b) => (bMatch ? 1 : 0) - (aMatch ? 1 : 0))
// popular / endingSoon 섹션에도 동일 prioritizeByIdol 적용
```

### 6.6 Group Deal Filters (Client)

SRCH 필터는 **client-side** — 서버 pagination/filter API 없음.

**2026-07-18 debounce pattern:**

```typescript
const [query, setQuery] = useState("")
const debouncedQuery = useDebouncedValue(query, 200)

const filtered = useMemo(
  () => filterGroupDeals(deals, { ...filters, query: debouncedQuery }),
  [deals, debouncedQuery, filters]
)
```

Input은 `query`에 즉시 반영, 무거운 filter/map은 `debouncedQuery`에만 의존.

### 6.7 GB App Mock Data Layer

**파일:** `lib/data/group-deals.ts` — `MOCK_GROUP_DEALS`, `loadHomeDashboardData()`, `createMockVirtualAccount()`

API 미연동 시 in-memory mock catalog fallback. `listGroupDeals()` 실패 또는 empty → mock merge. **production에서는 Admin seed + Open deal 필수.**

---

## 7. Dependency Graph (Simplified)

```
join/route.ts
  ├── prepareGroupDealCheckoutWorkflow
  ├── generateVirtualAccount
  └── serializeStoreGroupDealParticipant

trust-profile/route.ts
  ├── listGroupDeals({ leader_customer_id })
  └── buildLeaderTrustProfile()

price-recommendations/route.ts
  ├── listDealOptions()
  └── buildOptionPriceRecommendations()

apply-price-recommendations/route.ts
  ├── assertPriceDecreaseOnly()
  └── updateDealOptions()

group-deal-maintenance (cron)
  ├── processOverdueParticipantsWorkflow
  ├── updateGroupDeals → CLOSED
  └── autoConfirmOverdueDeliveries()

paginated-products.tsx
  ├── isFlaskSearchEnabled()
  ├── searchProducts → listProductsWithSort → orderProductsByIds

landing-page/index.tsx
  ├── retrieveGroupBuyingPreferences (if initialCustomer)
  ├── getLandingHomeData({ favoriteIdolGroup })
  └── LandingPageClient → AiRecommendationSlider

hosted/[id]/page.tsx
  ├── retrievePriceRecommendations()
  └── AiPriceRecommendationPanel → applyPriceRecommendations()

(gb-app)/home/page.tsx
  ├── resolveGbAppOnboardingRedirect()
  ├── requireCustomerForGbApp()
  ├── loadHomeDashboardData()
  └── HomeModeDashboard → ParticipantHomeBrowse | SellerDashboard

participant-home-browse/
  ├── useDebouncedValue(query, 200)
  ├── filterGroupDeals + filterDealsByCatalogTab
  └── GroupDealCardList (memo)

group-buying-mode-provider/
  ├── setModeState (optimistic)
  ├── startTransition → router.push
  └── setGroupBuyingMode (background server action)
```

---

## 8. Code Quality Assessment

### 8.1 Strengths

| 항목 | 설명 |
|------|------|
| **Domain separation** | rules/options/admin-rules/trust/price-rec pure functions + tests |
| **Hybrid isolation** | Flask failure doesn't break commerce; dev OFF by default |
| **Serialization layer** | API shape decoupled from MikroORM models |
| **Progressive enhancement** | AI slider/recommendations/trust optional (null/notFound) |
| **Admin SDK fix** | Proper JWT for custom admin routes |
| **Cron maintenance** | Single job: expire + close + D+7 auto-confirm |
| **GB App wireframe routing** | Centralized `gbAppRoutes` + tab config |
| **INP optimizations (2026-07-18)** | debounce, memo cards, optimistic mode switch |

### 8.2 Technical Debt

| 항목 | 심각도 | 설명 |
|------|--------|------|
| Reviews in metadata | Medium | MTRS — no normalized Review entity |
| Dual payment paths | Medium | VA + PG cart logic overlap in join |
| Price decrease refunds | Medium | DASH apply — no participant refund workflow |
| Client-side SRCH filter | Medium | No server pagination at scale |
| **GB App apply API** | **High** | `POST .../apply` mock — real join/apply not wired |
| **Seat hold server API** | **Medium** | CHKO 5min hold client-only |
| **i18n partial locales** | **Low** | GB card labels missing in ja/es/zh/ru |
| **Dual route trees** | **Medium** | `(main)/group-buying` + `(gb-app)/deals` parallel maintenance |
| API import depth | Medium | Manual `../` count — easy to break startup |
| **Stale dynamic route folders** | **Medium** | Empty `[id]` sibling caused Next compile error |
| Type mirror drift | Low | Frontend/backend status types manual |
| Stub adapters | Low | VA webhook, document AI, deposit confirm |
| Mock landing fallback | Low | MOCK_DEALS masks empty API state |
| landing `"active"` filter | Low | Legacy status string in openDeals filter |

### 8.3 Test Coverage

| Area | Coverage |
|------|----------|
| Backend utils | 9 spec files (rules, options, escrow, store, admin) |
| Trust / price-rec utils | **No dedicated spec yet** |
| Storefront | Minimal — no component/integration tests |
| GB App client perf | **Manual Performance tab only** |
| Flask BFF | Manual + contract doc |

---

## 9. Security Notes

| Topic | Status |
|-------|--------|
| Admin JWT | SDK-based — OK |
| `/store/me/*` | Middleware auth — OK |
| Leader-only APIs | price-rec, apply, trust — leader_customer_id check |
| Participant APIs | review, dispute — participant.customer_id check |
| Flask BFF | No auth on `/api/ai/*` — rate limit TBD |
| Bank account | `customer.metadata.refund_bank_account` — masked number |
| Review report | metadata flag only — no moderation queue |
| Behavior log | No PII beyond product/order IDs |

---

## 10. Extension Guide

### 10.1 Replace VA Stub with Real Bank API

1. Implement adapter in `utils/virtual-account.ts`
2. Add webhook route for deposit confirmation (CHKO-02)
3. Update subscriber/cron to confirm participant on webhook
4. Keep `checkout_path` contract unchanged

### 10.2 Add Normalized Review Entity

1. Create `GroupDealReview` model in group-buying module
2. Migrate `POST .../review` to write entity instead of metadata array
3. Update `buildLeaderTrustProfile` to query reviews table
4. Keep API response shape for storefront compatibility

### 10.3 Price Decrease → Participant Refund

1. After `apply-price-recommendations`, diff old/new option prices
2. Workflow step: calculate refund per CONFIRMED participant selection
3. Integrate with Toss/Stripe partial refund or VA credit metadata

### 10.4 New Store API Field

1. Add to model/metadata in `modules/group-buying/models`
2. Expose in `serializeStoreGroupDeal()` or account serializer
3. Mirror in `apps/storefront/src/types/`
4. **Verify API route import depth** when adding nested routes

### 10.5 Enable Flask in Local Dev

```env
SEARCH_API_ENABLED=true
NEXT_PUBLIC_SEARCH_API_URL=http://localhost:5000
# optional: FLASK_REQUEST_TIMEOUT_MS=800
```

### 10.6 Wire GB App Apply to Backend

1. Implement `POST /store/group-deals/:id/apply` (or align with existing join + selections + quantity)
2. Replace mock in `lib/data/group-deals.ts` with SDK fetch
3. Add server-side seat hold / `payment_deadline` if CHKO-03 required
4. Keep `(gb-app)/deals/[dealId]/deposit` contract unchanged

### 10.7 Document AI (Upstage) — Planned

**Existing orchestration:**

```
leader-purchase-proof / shipping forms
  → parseGroupDealReceiptDocument / parseGroupDealTrackingDocument
  → group-deal-document-ai.ts
  → flask-document-ai-client.ts (HYBRID_API_URL) | document-extract-stub.ts
```

**Rule:** OCR from browser directly 금지 — backend BFF only. Upstage는 merged backend `/api/v1/document-ai/*` 에 구현 예정.

### 10.8 Frontend INP Checklist (GB App)

1. Search inputs → `useDebouncedValue` (200ms default)
2. List children → `GroupDealCardList` + memo cards
3. Filter sidebar vs results → separate memo boundary (`CatalogResults`)
4. Server actions on click → optimistic local state + `startTransition`
5. Route renames → delete stale dynamic folders + restart dev server

---

## 11. File Reference Index

### Backend — Critical Path

| File | 역할 |
|------|------|
| `types/group-buying.ts` | Enums, DTOs |
| `modules/group-buying/service.ts` | Core domain + D+7 auto-confirm |
| `utils/group-deal-rules.ts` | Join/status rules |
| `utils/group-deal-store.ts` | Store API serialization |
| `utils/group-deal-account.ts` | Account + settlements serialization |
| `utils/leader-trust-profile.ts` | MTRS trust aggregation |
| `utils/group-deal-price-recommendations.ts` | DASH price algorithm |
| `api/store/group-deals/[id]/join/route.ts` | v3 VA join |
| `api/store/me/trust-profile/route.ts` | MTRS profile |
| `api/store/me/group-deals/[id]/price-recommendations/route.ts` | DASH GET |
| `api/store/me/group-deals/[id]/apply-price-recommendations/route.ts` | DASH POST |
| `api/store/me/group-deals/participations/[id]/review/route.ts` | MYJN review |
| `api/store/me/group-deals/settlements/route.ts` | MSTL |
| `jobs/group-deal-maintenance.ts` | Hourly cron |
| `workflows/group-deal-escrow.ts` | Escrow + overdue |

### Storefront — Critical Path

| File | 역할 |
|------|------|
| `lib/config/flask-search.ts` | Flask enable/timeout config |
| `lib/data/ai-engine.ts` | Recommendations + health |
| `lib/data/account-group-deals.ts` | Trust, price-rec, review, dispute |
| `lib/util/landing-deals.ts` | HOME-03 idol prioritize |
| `app/[countryCode]/(landing)/page.tsx` | HOME-01 redirect |
| `modules/landing/templates/landing-page/index.tsx` | Landing RSC + preferences dedup |
| `modules/products/components/ai-recommendation-slider/` | Flask recommendations UI |
| `modules/account/components/trust-profile-panel/` | MTRS UI |
| `modules/account/components/ai-price-recommendation-panel/` | DASH UI |
| `modules/group-buying/components/virtual-account-deposit/` | CHKO |
| `middleware.ts` | Region cache + dev timeout |
| **`lib/wireframe/routes.ts`** | **GB App URL + tab registry** |
| **`lib/hooks/use-debounced-value.ts`** | **Search debounce (INP)** |
| **`lib/data/gb-app-auth-flow.ts`** | **Onboarding + signup server actions** |
| **`lib/data/group-buying-mode.ts`** | **Mode cookie + preferences sync** |
| **`app/[countryCode]/(gb-app)/layout.tsx`** | **GB App shell + I18n + tab bar** |
| **`app/[countryCode]/(gb-app)/home/page.tsx`** | **Role-based home RSC gate** |
| **`modules/group-buying/components/participant-home-browse/`** | **HOME/SRCH client browse** |
| **`modules/group-buying/components/home-mode-dashboard/`** | **Participant vs leader dashboard** |
| **`modules/group-buying/components/group-buying-mode-provider/`** | **Optimistic mode switch** |
| **`modules/group-buying/components/group-deal-card-list/`** | **Memoized card list** |
| **`modules/design-system/components/bb-group-buy-card.tsx`** | **Memoized deal card UI** |
| **`modules/group-buying/components/leader-settlement-view/`** | **Leader settlement (import path fix)** |
| **`modules/group-buying/components/deal-deposit-flow/`** | **GB App CHKO** |
| **`modules/layout/components/gb-app-tab-bar/`** | **Bottom navigation** |

---

## 12. v3 Spec Mapping (Code Level)

| ID | Status | Primary implementation |
|----|--------|------------------------|
| HOME-01 | Partial | `(landing)/page.tsx` redirect; GB App `(gb-app)/home` + mode switch |
| HOME-03 | Done | `landing-deals.ts`, `ai-engine.ts` favorite_idol_group |
| **GB HOME/SRCH** | **Frontend done** | `participant-home-browse`, `search-browse`, debounce + memo |
| **GB DETL→DONE** | **Frontend done** | `deal-detail-view`, `deal-apply-form`, `deal-deposit-flow`, `deal-complete-view` |
| **GB MYJN/RPTB** | **Frontend done** | `participation-detail-view`, `participant-review-form`, `[participantId]` routes |
| **GB Leader 10-step** | **Frontend done** | `seller/deals/[dealId]/*`, `leader-settlement-view` |
| **GB My 9-screen** | **Frontend done** | `(gb-app)/my/*` |
| SRCH/DETL | Done | group-buying modules (legacy + gb-app parallel) |
| CHKO-01/03 | Partial | VA UI + 5min deadline; apply API mock; webhook stub only |
| DASH-05 | Partial | price-rec utils + panel; refund automation missing |
| MTRS-01 | Done | leader-trust-profile + trust-reviews page |
| MYJN-05/06/07 | Done | review/dispute routes + D+7 cron |
| ACCT-01/02 | Partial | bank-account done; real-name auth missing |
| QFIL | Done | urgent-fill API + filter/badge |
| Flask | Done | search, recommendations, behavior log BFF |

---

## 13. Conclusion

코드베이스는 **Medusa module + workflow + pure utils** 패턴을 충실히 따르며, v3 스펙(가상계좌·개봉·구조화 영수증)과 P2(MTRS·DASH·HOME-03)를 **metadata 집계 + serialization 확장**으로 흡수했다. Flask 연동은 **opt-in dev + BFF + fire-and-forget**으로 commerce critical path와 분리되어 있다.

**2026-07-18 추가:** `(gb-app)` 라우트 그룹으로 와이어프레임 기반 **참여자·총대·마이 UI 전면**을 구현했으나, apply/seat-hold 등 핵심 API는 아직 mock·stub 상태다. 프론트엔드는 debounce·React.memo·optimistic mode switch로 INP 병목을 완화했고, dynamic route stale folder·import path 오류는 dev server 전체 500(하얀 화면)을 유발할 수 있어 **라우트 변경 후 재시작**이 필수이다.

**우선 리팩터링 후보:**

1. **GB App apply API** — mock → `POST /store/group-deals/:id/apply` (quantity, selections)
2. Review/Dispute — metadata 배열 → 정규화 엔티티
3. Join route — VA vs cart path strategy pattern 분리
4. DASH apply — 가격 인하 시 participant refund workflow
5. **Route tree consolidation** — `(main)/group-buying` vs `(gb-app)/deals` 중복 제거
6. API route imports — path alias 또는 barrel로 depth 오류 방지
7. Stub → production adapter (VA webhook, document OCR / Upstage)
8. Storefront integration tests: gb-app join → deposit → review flow
9. i18n — GB card labels for ja/es/zh/ru

---

*본 문서는 2026-07-18 시점 코드베이스 정적 분석 결과입니다 (2026-07-15 초판 갱신).*
