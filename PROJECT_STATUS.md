# Group Buying Site — 프로젝트 현황 및 기술 문서

> **작성 기준일:** 2026-07-14  
> **저장소 경로:** `group-buying-site/` (pnpm monorepo)  
> **스택:** Medusa v2.17.2 (`@dtc/backend`) + Next.js 15.5.18 (`@dtc/storefront`)

---

## 1. 프로젝트 개요

K-POP 굿즈(앨범, 응원봉, 포토카드 등)를 대상으로 **총대(리더) 중심의 공동구매(Group Deal)** 를 운영하는 이커머스 플랫폼이다. 참여자는 빌링키/SetupIntent 기반 **예약 결제(escrow)** 로 1차금을 확보하고, 최소 인원 달성 시 일괄 캡처·배송·수령 확인 후 정산까지 이어지는 흐름을 Medusa v2 커스텀 모듈로 구현한다. 스토어프론트는 Next.js App Router 기반 다국어 쇼핑몰과 프리미엄 랜딩 페이지, 마이페이지(리더/참여자) UI를 제공한다.

---

## 2. 현재까지 구현된 핵심 기능

### 2.1 백엔드 — 공동구매 도메인 모듈

| 영역 | 구현 내용 |
|------|-----------|
| **커스텀 모듈** | `src/modules/group-buying/` — `GroupBuyingModuleService` (`service.ts`) |
| **데이터 모델** | `GroupDeal`, `GroupDealOption`, `GroupDealParticipant`, `GroupDealParticipantSelection`, `GroupDealWaitlistEntry` (`models/index.ts`) |
| **상태 머신** | `GroupDealStatus`, `GroupDealParticipantStatus`, `GroupDealDepositStatus`, `GroupDealWaitlistStatus` 등 (`types/group-buying.ts`) |
| **참여 규칙** | `assertDealJoinable`, `evaluateDealStatus`, `countUniqueCommittedParticipants` (`utils/group-deal-rules.ts`) |
| **옵션/1차금 계산** | `resolveParticipantQuantity`, `computeFirstPaymentAmount`, `assertSelectionsWithinLimits` (`utils/group-deal-options.ts`) |
| **리더 보증금 가드** | `assertDepositBeforeActivate`, `assertStatusTransitionAllowed` (`utils/group-deal-admin-rules.ts`) |
| **DB 마이그레이션** | `Migration20250710120000` ~ `Migration20260714190000` (7개 파일) |

### 2.2 백엔드 — 결제·에스크로·빌링

| 영역 | 구현 내용 |
|------|-----------|
| **토스페이먼츠 PG** | `src/modules/toss-payments/` — 빌링키 등록·캡처·환불 (`client.ts`, `service.ts`) |
| **Stripe 공동구매 PG** | `src/modules/stripe-group-deal/` — SetupIntent 예약 결제 (`client.ts`, `service.ts`) |
| **한국 PG (일반 결제)** | `src/modules/korean-pg-payment/` |
| **에스크로 해제** | `GroupDealEscrowService.releaseParticipantEscrow()` (`services/group-deal-escrow.ts`) |
| **빌링 캡처** | `createGroupDealBillingCaptureService()` (`services/group-deal-billing-capture.ts`) |
| **빌링키 암호화** | `secure-billing-key.ts`, `BILLING_KEY_ENCRYPTION_SECRET` |
| **웹훅** | `korean-pg-payment-webhook` subscriber, `korean-pg-webhook` workflow |

### 2.3 백엔드 — 워크플로우

| 워크플로우 | 파일 | 역할 |
|------------|------|------|
| `prepareGroupDealCheckoutWorkflow` | `workflows/group-deals.ts` | 참여 슬롯 예약 → 카트 생성 → 1차금 산출 |
| `captureGroupDealPaymentsWorkflow` | `workflows/group-deal-billing.ts` | 최소 인원 달성 후 RESERVED 참여자 일괄 캡처 |
| `processOverdueParticipantsWorkflow` | `workflows/group-deal-escrow.ts` | 입금 기한 초과 참여자 슬롯 해제 |
| `confirmParticipantDeliveryWorkflow` | `workflows/group-deal-escrow.ts` | 수령 확인 → 전원 확인 시 자동 정산 |
| `vacateParticipantSlot` + waitlist 매칭 | `workflows/group-deal-escrow.ts` | 공석 발생 시 `matchWaitlistEntry` 자동 매칭 |
| `joinDemandSurveyWorkflow` | `workflows/demand-survey.ts` | 상품 metadata 기반 수요조사 참여 |
| `createGroupDealStep` / Admin CRUD | `workflows/group-deals.ts` | Admin 공구 생성·수정 |

### 2.4 백엔드 — Store API (`/store`)

| Method | 경로 | 핸들러 |
|--------|------|--------|
| `GET` | `/store/group-deals` | `api/store/group-deals/route.ts` → `serializeStoreGroupDeal()` |
| `GET` | `/store/group-deals/:id` | `api/store/group-deals/[id]/route.ts` |
| `POST` | `/store/group-deals/:id/join` | `prepareGroupDealCheckoutWorkflow` |
| `POST` | `/store/group-deals/:id/waitlist` | 대기열 등록 |
| `POST` | `/store/group-deals/:id/billing-key` | 빌링키 등록 |
| `POST` | `/store/products/:id/demand-survey/participate` | 수요조사 참여 |
| `GET/POST/DELETE` | `/store/me/payment-methods` | 저장 결제수단 CRUD |
| `POST` | `/store/me/payment-methods/stripe/setup` | Stripe SetupIntent 생성 |
| `POST` | `/store/me/payment-methods/stripe/complete` | SetupIntent 완료 → `appendSavedPaymentMethod()` |
| `POST` | `/store/me/payment-methods/toss/billing` | Toss 빌링 세션 URL 생성 |
| `GET/PUT` | `/store/me/preferences` | `readGroupBuyingPreferences()` / 알림 설정 |
| `GET` | `/store/me/group-deals/hosted` | 리더(총대) 공구 목록 |
| `GET` | `/store/me/group-deals/participations` | 내 참여 목록 |
| `POST` | `/store/me/group-deals/participations/:id/confirm-delivery` | `confirmParticipantDeliveryWorkflow` |
| `GET` | `/store/me/group-deals/settlements` | 정산 내역 |
| `POST` | `/store/me/group-deals/:id/deposit` | 리더 보증금 예치 |

인증 미들웨어: `api/store/me/middlewares.ts`

### 2.5 백엔드 — Admin API 및 대시보드 UI

| 영역 | 경로 |
|------|------|
| **Admin REST** | `api/admin/group-deals/` — CRUD, `capture-payments`, `settle`, `cancel`, `quote-shipping`, `receipt`, `tracking`, `packing-slip` |
| **Admin UI** | `src/admin/routes/group-deals/` — 목록·생성·상세 페이지 |
| **리더 관리 패널** | `src/admin/routes/group-deals/[id]/components/leader-management-panel.tsx` |
| **React Query 훅** | `src/admin/hooks/use-group-deals.ts` |

### 2.6 백엔드 — 이벤트·스케줄러

| 구성요소 | 파일 | 동작 |
|----------|------|------|
| **최소 인원 캡처** | `subscribers/group-deal-minimum-reached-capture.ts` | `group_deal.updated` → `captureGroupDealPaymentsWorkflow` |
| **주문 연동** | `subscribers/order-placed-group-deal.ts`, `confirm-group-deal-participation.ts` | 주문 완료 시 참여 상태 갱신 |
| **알림 (메타데이터 로그)** | `subscribers/group-deal-notifications.ts` | `group_deal.waitlist_matched`, `group_deal.updated` → `customer.metadata.notification_log` |
| **정기 유지보수** | `jobs/group-deal-maintenance.ts` | 매시간 `processOverdueParticipantsWorkflow` + `ends_at` 지난 deal `CLOSED` 처리 |

### 2.7 백엔드 — 시드·스크립트

| 스크립트 | 명령 |
|----------|------|
| `seed-locales.ts` | `pnpm seed:locales` |
| `seed-currency-regions.ts` | `pnpm seed:regions` |
| `seed-korea-toss-payment.ts` | `pnpm seed:korea-toss` |
| `seed-stripe-payment.ts` | `pnpm seed:stripe` |
| `initial-data-seed.ts` | 초기 데이터 |

### 2.8 백엔드 — 단위 테스트

`src/utils/__tests__/` — 9개 spec 파일:

- `group-deal-rules.spec.ts`
- `group-deal-options.spec.ts`
- `group-deal-escrow.spec.ts`
- `group-deal-checkout-payment.spec.ts`
- `group-deal-store.spec.ts`
- `group-deal-admin-rules.spec.ts`
- `group-deal-deposit-guards.spec.ts`
- `toss-payments-client.spec.ts`
- `korean-pg-webhook-signature.spec.ts`

### 2.9 스토어프론트 — 랜딩 페이지 (`(landing)` route group)

| 구성요소 | 파일 |
|----------|------|
| **페이지** | `app/[countryCode]/(landing)/page.tsx` → `LandingPageTemplate` |
| **레이아웃** | `app/[countryCode]/(landing)/layout.tsx` — `LandingNav`, `LandingFooter` |
| **데이터 로더** | `lib/util/landing-deals.ts` — `getLandingHomeData()`, `mapGroupDealToLandingCard()` |
| **목 데이터 폴백** | `MOCK_DEALS` (BTS, IVE, NewJeans, aespa, RIJE 등 6건) — API 결과 없을 때 사용 |
| **히어로** | `modules/landing/components/landing-hero/` — `formatCountdown()`, SSR placeholder (`--:--:--`) |
| **카드** | `modules/landing/components/group-buy-card/` — `useMounted()` 기반 시간 라벨 |
| **라이브 티커** | `modules/landing/components/live-ticker/` — `TICKER_MESSAGES` 고정 목록 |
| **클라이언트 템플릿** | `modules/landing/templates/landing-page/landing-page-client.tsx` |
| **i18n** | `i18n/dictionaries/landing-shared.ts`, `ko.ts`, `en.ts` 등 6개 로케일 |
| **브랜드 토큰** | `tailwind.config.js` — `brand.pink`, `brand.purple` |

### 2.10 스토어프론트 — 공동구매 쇼핑

| 구성요소 | 파일 |
|----------|------|
| **목록** | `app/[countryCode]/(main)/group-buying/page.tsx` → `GroupDealsListTemplate` |
| **상세** | `app/[countryCode]/(main)/group-buying/[id]/page.tsx` → `GroupDealDetailTemplate` |
| **필터** | `modules/group-buying/components/group-deal-filters/` — `filterGroupDeals()` |
| **카탈로그** | `modules/group-buying/components/group-deals-catalog/` |
| **참여 폼** | `modules/group-buying/components/join-deal-form/` → `startGroupDealCheckout()` |
| **대기열** | `modules/group-buying/components/waitlist-form/` → `joinGroupDealWaitlist()` |
| **신뢰 패널** | `modules/group-buying/components/leader-trust-panel/` — `computeLeaderTrustScore()` |
| **진행률** | `modules/group-buying/components/group-deal-progress/` |
| **데이터 레이어** | `lib/data/group-deals.ts` — `listGroupDeals`, `retrieveGroupDeal`, `startGroupDealCheckout` |

### 2.11 스토어프론트 — 마이페이지 (`/account`)

| 라우트 | 페이지 | 컴포넌트 |
|--------|--------|----------|
| `/account` | `@dashboard/page.tsx` | `AccountOverview` |
| `/account/payment-methods` | `payment-methods/page.tsx` | `PaymentMethodsPanel`, `StripeSetupForm` |
| `/account/group-deals/hosted` | `hosted/page.tsx` | `HostedDealsList` |
| `/account/group-deals/participations` | `participations/page.tsx` | `ParticipationsList`, `ParticipationTimeline`, `ConfirmDeliveryButton` |
| `/account/settlements` | `settlements/page.tsx` | `SettlementsTable` |
| `/account/preferences` | `preferences/page.tsx` | `PreferencesForm` |

서버 액션: `lib/data/account-group-deals.ts` — `listHostedGroupDeals`, `confirmParticipantDelivery`, `createStripeSetupSession`, `completeStripeSetup`, `createTossBillingSession` 등

### 2.12 스토어프론트 — 기타

| 영역 | 구현 |
|------|------|
| **수요조사** | `modules/products/components/demand-survey-panel/` |
| **체크아웃 PG** | `TossPaymentsContainer`, `StripeWrapper`, `PaymentButton` |
| **다국어** | `i18n/` — ko, en, ja, es, zh, ru + `middleware.ts` region routing |
| **Hydration 방지** | `lib/hooks/use-mounted.ts` |

---

## 3. 프로젝트 구조 및 핵심 로직

### 3.1 Monorepo 구조

```
group-buying-site/
├── package.json              # pnpm workspace 루트, turbo 스크립트
├── pnpm-workspace.yaml       # apps/**
├── apps/
│   ├── backend/              # @dtc/backend — Medusa v2
│   │   ├── medusa-config.ts  # group-buying 모듈, toss/stripe PG 등록
│   │   └── src/
│   │       ├── modules/      # group-buying, toss-payments, stripe-group-deal
│   │       ├── api/          # store/, admin/ REST
│   │       ├── workflows/    # group-deals, group-deal-billing, group-deal-escrow
│   │       ├── services/     # escrow, billing-capture, customer-payment-methods
│   │       ├── subscribers/  # 이벤트 핸들러
│   │       ├── jobs/         # cron
│   │       ├── admin/        # Medusa Admin 확장 UI
│   │       └── utils/        # 도메인 규칙·직렬화
│   └── storefront/           # @dtc/storefront — Next.js 15
│       └── src/
│           ├── app/[countryCode]/   # (landing), (main), (checkout) route groups
│           ├── modules/             # landing, group-buying, account, checkout
│           ├── lib/data/            # Server Actions (Medusa JS SDK)
│           └── i18n/                # 다국어 사전
```

### 3.2 공동구매 참여 흐름 (핵심)

```mermaid
sequenceDiagram
    participant U as 참여자 (Storefront)
    participant API as POST /store/group-deals/:id/join
    participant WF as prepareGroupDealCheckoutWorkflow
    participant SVC as GroupBuyingModuleService
    participant PG as Toss / Stripe PG

    U->>API: email, quantity, selections, country_code
    API->>WF: run({ group_deal_id, ... })
    WF->>SVC: validateJoinSelections()
    WF->>SVC: reserveParticipantSlot()
    Note over SVC: status=PENDING, payment_deadline 설정
    WF->>WF: createCartWorkflow / addToCartWorkflow
    U->>PG: checkout에서 빌링키/SetupIntent 등록
    PG-->>SVC: participant.status=RESERVED
    Note over SVC: group_deal.updated 이벤트
    SVC->>WF: captureGroupDealPaymentsWorkflow (minimum_reached 시)
    WF->>PG: 빌링키 캡처 → status=CONFIRMED
```

**주요 함수 체인:**

1. `POST /store/group-deals/:id/join` → `prepareGroupDealCheckoutWorkflow` (`workflows/group-deals.ts`)
2. `GroupBuyingModuleService.validateJoinSelections()` → `assertDealJoinable()` + `assertSelectionsWithinLimits()`
3. `computeFirstPaymentAmount()` — 옵션별 단가 스냅샷 합산
4. 결제 완료 후 `group-deal-minimum-reached-capture` subscriber → `captureGroupDealPaymentsWorkflow`
5. `GroupDealBillingCaptureService` — Toss `billingKey` / Stripe `payment_method` off-session capture

### 3.3 공석·대기열(waitlist) 매칭

1. 입금 기한 초과 또는 취소 → `processOverdueParticipantsWorkflow` / `vacateParticipantSlotStep`
2. `GroupDealEscrowService.releaseParticipantEscrow()` — PENDING/RESERVED/CONFIRMED별 분기 처리
3. `GroupBuyingModuleService.matchNextWaitlistEntry()` — `priority` → `queue_position` → `created_at` 순
4. 매칭 성공 → `emitGroupDealWaitlistMatched()` → `group-deal-notifications` subscriber

### 3.4 수령 확인 → 정산

1. `POST /store/me/group-deals/participations/:id/confirm-delivery`
2. `confirmParticipantDeliveryWorkflow` — `delivery_confirmed_at` 기록
3. 전 참여자 확인 시 deal status → `SETTLED`, `GroupDealSettlementResult` 반환
4. 리더 정산 내역: `GET /store/me/group-deals/settlements` → `serializeSettlementRecord()`

### 3.5 리더(총대) 보증금 가드

Admin에서 deal status를 `OPEN`으로 전환할 때:

```typescript
// utils/group-deal-admin-rules.ts
assertDepositBeforeActivate(deal, nextStatus)
// deposit_status !== DEPOSITED 이면 MedusaError NOT_ALLOWED
```

리더 보증금 API: `POST /store/me/group-deals/:id/deposit`

### 3.6 랜딩 페이지 데이터 흐름

```
LandingPageTemplate (RSC)
  └─ getLandingHomeData()
       ├─ listGroupDeals() → GET /store/group-deals
       ├─ openDeals.length > 0 → mapGroupDealToLandingCard()
       └─ else → MOCK_DEALS (데모 데이터)
  └─ LandingPageClient (Client Component)
       ├─ liveCount = sum(currentParticipants)
       ├─ popular / trending / endingSoon 섹션 분류
       └─ LandingHero + GroupBuyCard + LiveTicker
```

`mapGroupDealToLandingCard()`는 `deal.metadata.goods_type`으로 카테고리를 추론하고, 이미지는 `CATEGORY_IMAGES`(Unsplash URL)를 사용한다.

### 3.7 Medusa 설정 (`medusa-config.ts`)

- 커스텀 모듈: `./src/modules/group-buying`
- Payment providers: `toss-payments`, `stripe-group-deal`
- Translation module 활성화 (`featureFlags.translation: true`)
- DB: `DATABASE_URL`, Redis: `REDIS_URL` (선택)

---

## 4. 설치 및 실행 방법

### 4.1 사전 요구사항

- **Node.js** >= 20
- **pnpm** 10.x (`packageManager: pnpm@10.11.1`)
- **PostgreSQL** (로컬 또는 Supabase)
- (선택) **Redis** — 미설정 시 in-memory

### 4.2 의존성 설치

```bash
cd group-buying-site
pnpm install
```

### 4.3 환경 변수 설정

**Backend** — `apps/backend/.env` (템플릿: `apps/backend/.env.template`):

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/group_buying
STORE_CORS=http://localhost:8000
ADMIN_CORS=http://localhost:5173,http://localhost:9000
AUTH_CORS=http://localhost:5173,http://localhost:9000
JWT_SECRET=dev-jwt-secret-change-in-production
COOKIE_SECRET=dev-cookie-secret-change-in-production

# PG (선택 — 결제·빌링키 기능 사용 시)
TOSS_SECRET_KEY=
TOSS_CLIENT_KEY=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
BILLING_KEY_ENCRYPTION_SECRET=
```

**Storefront** — `apps/storefront/.env.local` (템플릿: `apps/storefront/.env.template`):

```env
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<Medusa Admin에서 발급>
NEXT_PUBLIC_DEFAULT_REGION=kr
NEXT_PUBLIC_BASE_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_KEY=<Stripe publishable key>
NEXT_PUBLIC_TOSS_CLIENT_KEY=<Toss client key>
```

### 4.4 DB 마이그레이션 및 시드

```bash
cd apps/backend
pnpm db:migrate
pnpm seed:regions
pnpm seed:locales
pnpm seed:korea-toss    # 한국 토스 PG provider 등록
pnpm seed:stripe        # Stripe provider 등록
```

### 4.5 개발 서버 실행

**루트에서 동시 실행:**

```bash
pnpm dev
```

**개별 실행:**

```bash
pnpm backend:dev      # Medusa :9000
pnpm storefront:dev   # Next.js :8000
```

| URL | 설명 |
|-----|------|
| http://localhost:8000/kr | 스토어프론트 홈 (랜딩) |
| http://localhost:8000/kr/group-buying | 공동구매 목록 |
| http://localhost:9000/app | Medusa Admin (공구 관리) |

### 4.6 빌드·테스트

```bash
pnpm build
pnpm --filter @dtc/backend test:unit
pnpm --filter @dtc/storefront build
```

---

## 5. 현재 한계점 및 향후 과제 (To-Do)

### 5.1 데이터·UI

| 항목 | 현황 | 보완 방향 |
|------|------|-----------|
| **랜딩 목 데이터** | `MOCK_DEALS` 하드코딩 — DB 공구 없으면 데모 표시 | Admin에서 공구 등록 또는 seed 스크립트 추가 |
| **랜딩 이미지** | `CATEGORY_IMAGES` Unsplash placeholder | `GroupDeal` / Product thumbnail 연동 |
| **LIVE 티커·후기** | `TICKER_MESSAGES`, i18n 고정 문구 | 실시간 참여 이벤트 API 또는 WebSocket |
| **liveCount** | mock/API 참여자 수 합산 | 실제 active session 기반 집계 (선택) |

### 5.2 알림

| 항목 | 현황 | 보완 방향 |
|------|------|-----------|
| **이메일/푸시** | `group-deal-notifications.ts`가 `customer.metadata.notification_log`에만 기록 | SendGrid, Firebase, Medusa Notification module 연동 |
| **알림 설정** | `readGroupBuyingPreferences()` — `notify_vacancy`, `notify_progress` | 실제 발송 파이프라인 |

### 5.3 결제·정산

| 항목 | 현황 | 보완 방향 |
|------|------|-----------|
| **Toss 빌링 콜백** | `createTossBillingSession()` URL 생성까지 | redirect callback에서 billing key 저장 완료 |
| **리더 실지급** | `SETTLED` 상태·정산 레코드만 생성 | 계좌 이체/PG payout API |
| **2차금(배송비)** | `split_product_shipping` 모델·`group-deal-second-payment` workflow 골격 | Admin quote → 참여자 2차 청구 UI/E2E |
| **Stripe/Toss 키** | `.env.template`에 placeholder | 운영 키 설정 및 webhook endpoint 등록 |

### 5.4 백엔드 운영

| 항목 | 현황 | 보완 방향 |
|------|------|-----------|
| **Cron job 로딩** | `group-deal-maintenance.ts` — 빌드 dist 경로 미인식 가능성 | `medusa build` 후 job 로드 확인, `MEDUSA_WORKER_MODE=worker` 분리 |
| **`GroupDealStatus.ACTIVE`** | `group-deal-maintenance.ts`에서 참조하나 enum에 미정의 | **수정 완료** — `OPEN` + `MINIMUM_REACHED` 사용 |
| **통합 테스트** | HTTP integration test 스크립트 존재, E2E 미완 | join → capture → delivery → settle 시나리오 |

### 5.5 스토어프론트

| 항목 | 현황 | 보완 방향 |
|------|------|-----------|
| **Framer Motion** | CSS animation으로 대체 | 패키지 설치 및 스크롤 애니메이션 고도화 |
| **TypeScript** | `group-deal-filters.ts` 등 기존 tsc warning | 타입 정리 |
| **Hydration** | `LandingHero`, `GroupBuyCard` 수정 완료 | `kpop-album-card` 등 `Date.now()` 사용 컴포넌트 추가 점검 |

### 5.6 문서·DevOps

| 항목 | 현황 | 보완 방향 |
|------|------|-----------|
| **README** | 루트 README 미작성 | 본 문서를 README로 링크 또는 요약 |
| **CI/CD** | turbo lint/test 스크립트만 존재 | GitHub Actions 파이프라인 |
| **프로덕션 배포** | `.env.production.template` (backend) | Supabase/Vercel/Railway 배포 가이드 |

---

## 부록 — 주요 환경 변수 요약

| 변수 | 용도 |
|------|------|
| `GROUP_DEAL_PAYMENT_DEADLINE_HOURS` | 참여 입금 기한 (기본 24h) |
| `GROUP_DEAL_MAINTENANCE_CRON` | 유지보수 cron (기본 `0 * * * *`) |
| `PG_CAPTURE_MAX_RETRIES` | 빌링 캡처 재시도 횟수 |
| `TOSS_SUPPORTED_COUNTRIES` | 토스 PG 적용 국가 (기본 `kr`) |
| `STRIPE_SUPPORTED_COUNTRIES` | Stripe PG 적용 국가 (비우면 kr 제외) |

---

*본 문서는 `group-buying-site` 코드베이스 실제 파일·API·워크플로우를 기준으로 작성되었습니다.*
