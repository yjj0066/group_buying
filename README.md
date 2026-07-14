# Group Buying Site (공동구매몰)

Medusa v2 + Next.js 15 기반 **K-POP 굿즈 공동구매(Group Deal)** 플랫폼입니다.  
총대(리더) 보증금, 참여자 예약 결제(에스크로), 대기자(waitlist) 자동 매칭, 수령 확인 후 정산까지 공동구매 특화 도메인을 커스텀 모듈로 구현했습니다.

| 서비스 | URL |
|--------|-----|
| 쇼핑몰 (랜딩) | http://localhost:8000/kr |
| 공동구매 목록 | http://localhost:8000/kr/group-buying |
| 마이페이지 | http://localhost:8000/kr/account |
| 관리자 (Admin) | http://localhost:9000/app |
| 백엔드 API | http://localhost:9000 |

> `http://localhost:9000/` 에서 `Cannot GET /` 가 보이면 **정상**입니다. Admin은 `/app` 으로 접속합니다.

---

## 주요 기능

### 공동구매 도메인

| 기능 | 설명 |
|------|------|
| **공동구매 + 예약 결제** | KR: Toss 빌링키 / 해외: Stripe SetupIntent → `minimum_reached` 시 `captureGroupDealPaymentsWorkflow` 일괄 캡처 |
| **총대 보증금** | `assertDepositBeforeActivate()` — `deposit_status=deposited` 전 `open` 전환 불가 |
| **에스크로·공석 처리** | `GroupDealEscrowService.releaseParticipantEscrow()` — 미결제 만료·취소 시 슬롯 해제 |
| **대기자(waitlist)** | `enqueueWaitlistEntry()` / `matchNextWaitlistEntry()` — 공석 발생 시 자동 매칭 |
| **멤버/버전 옵션** | `GroupDealOption` + `GroupDealParticipantSelection` — 포토카드 멤버별 수량 선택 |
| **2단계 결제 모델** | `payment_phase_mode: split_product_shipping` (1차 상품가 + 2차 배송비, 워크플로 골격) |
| **수요조사** | `joinDemandSurveyWorkflow` — 상품 metadata 기반 (결제와 분리) |

### 스토어프론트

| 기능 | 설명 |
|------|------|
| **프리미엄 랜딩** | `(landing)` route group — `LandingHero`, `GroupBuyCard`, `LiveTicker`, 카테고리 필터 |
| **공동구매 쇼핑** | 목록 필터, 상세(`LeaderTrustPanel`, `GroupDealProgress`), `JoinDealForm`, `WaitlistForm` |
| **마이페이지** | 결제수단, 총대 공구, 참여 내역·타임라인, 정산, 알림 설정 |
| **6개국어 UI** | ko / en / es / ru / zh / ja — 랜딩·공구·계정·결제 포함 |
| **아이돌 굿즈 UI** | 제작 타임라인, 참여율 게이지, 특전 해금 |

### 운영·백오피스

| 기능 | 설명 |
|------|------|
| **Admin UI** | `src/admin/routes/group-deals/` — 공구 CRUD, 리더 관리 패널 |
| **Cron job** | `group-deal-maintenance.ts` — 매시간 미결제 만료 + `ends_at` 경과 deal `closed` |
| **알림 (개발)** | `group-deal-notifications.ts` → `customer.metadata.notification_log` (이메일 발송 미연동) |

---

## 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 모노레포 | pnpm workspace + Turbo | pnpm 10.11.1 |
| 백엔드 | Medusa Framework | **2.17.2** (`@dtc/backend`) |
| 스토어프론트 | Next.js (App Router, Turbopack) | **15.5.18** (`@dtc/storefront`) |
| UI | React | 19.0.5 |
| DB | PostgreSQL (Supabase 권장) | 15+ |
| 결제 (KR) | Toss Payments | `src/modules/toss-payments/` |
| 결제 (해외) | Stripe SetupIntent | `src/modules/stripe-group-deal/` |
| Node.js | >= 20 | |

---

## 프로젝트 구조

```
group-buying-site/
├── package.json                    # pnpm dev / build / backend:dev / storefront:dev
├── pnpm-workspace.yaml
├── PROJECT_STATUS.md               # 기술 현황 상세 문서
├── DEPLOYMENT.md                   # Vercel + Supabase 배포
├── README.md
├── apps/
│   ├── backend/                    # @dtc/backend — Medusa v2
│   │   ├── medusa-config.ts        # group-buying 모듈, Toss/Stripe PG
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── group-buying/   # GroupBuyingModuleService, models, migrations
│   │       │   ├── toss-payments/
│   │       │   ├── stripe-group-deal/
│   │       │   └── korean-pg-payment/
│   │       ├── workflows/
│   │       │   ├── group-deals.ts          # join, checkout, Admin CRUD
│   │       │   ├── group-deal-billing.ts   # 빌링키/SetupIntent, 캡처
│   │       │   ├── group-deal-escrow.ts    # 에스크로, waitlist, 정산, 수령확인
│   │       │   ├── group-deal-second-payment.ts  # 2차 배송비 (스켈레톤)
│   │       │   └── demand-survey.ts
│   │       ├── services/
│   │       │   ├── group-deal-escrow.ts
│   │       │   ├── group-deal-billing-capture.ts
│   │       │   └── customer-payment-methods.ts
│   │       ├── api/
│   │       │   ├── store/group-deals/      # 공개 Store API
│   │       │   ├── store/me/               # 인증 API (참여, 정산, 결제수단)
│   │       │   └── admin/group-deals/      # Admin REST
│   │       ├── subscribers/                # order.placed, 캡처, 알림, webhook
│   │       ├── jobs/group-deal-maintenance.ts
│   │       ├── admin/routes/group-deals/   # Admin React UI
│   │       └── scripts/                    # seed (locales, regions, toss, stripe)
│   └── storefront/                 # @dtc/storefront — Next.js 15
│       └── src/
│           ├── app/[countryCode]/
│           │   ├── (landing)/              # 랜딩 홈
│           │   ├── (main)/                 # 공구, 계정, 상품, 장바구니
│           │   └── (checkout)/             # 결제
│           ├── modules/
│           │   ├── landing/                # LandingHero, GroupBuyCard, LiveTicker
│           │   ├── group-buying/           # 목록·상세·참여·대기자
│           │   ├── account/                # 마이페이지 컴포넌트
│           │   └── checkout/               # Toss / Stripe UI
│           ├── lib/
│           │   ├── data/group-deals.ts
│           │   ├── data/account-group-deals.ts
│           │   └── util/landing-deals.ts   # getLandingHomeData(), MOCK_DEALS
│           └── i18n/                       # 6개국어 dictionary
```

---

## 빠른 시작

### 필요 환경

- **Node.js** v20 이상
- **pnpm** v10 이상 (`npm install -g pnpm`)
- **PostgreSQL** — 로컬 또는 [Supabase](https://supabase.com)

#### Windows 참고

- PowerShell에서 `pnpm`이 안 되면: `npm install -g pnpm` 후 **터미널 재시작**
- `npx` 실행 정책 오류 시: `npx.cmd medusa ...` 또는 CMD 사용
- `pnpm db:migrate` 등은 `apps/backend` 폴더에서 실행

### 1. 의존성 설치

```bash
git clone <repository-url>
cd group-buying-site
pnpm install
```

### 2. 환경 변수

```bash
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local
```

**Backend** (`apps/backend/.env`) — 최소 설정:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/group_buying
STORE_CORS=http://localhost:8000
ADMIN_CORS=http://localhost:5173,http://localhost:9000
AUTH_CORS=http://localhost:5173,http://localhost:9000
JWT_SECRET=dev-jwt-secret-change-in-production
COOKIE_SECRET=dev-cookie-secret-change-in-production
```

**Storefront** (`apps/storefront/.env.local`):

```env
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_DEFAULT_REGION=kr
NEXT_PUBLIC_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SITE_NAME=공동구매몰
```

Supabase 사용 시 `DATABASE_SSL=true` 및 Direct connection(5432) URL을 사용하세요. 자세한 내용은 아래 **데이터베이스 설정** 참고.

### 3. DB 마이그레이션 · 시드 · 관리자

```bash
cd apps/backend

pnpm db:migrate              # 테이블 생성 (group-buying migrations 포함)
pnpm medusa user -e admin@test.com -p supersecret
pnpm seed:locales            # UI 로케일 6개
pnpm seed:regions            # Korea / America 리전 + KRW 가격
pnpm seed:korea-toss         # 한국 Toss 결제 provider
pnpm seed:stripe             # 해외 Stripe group-deal provider
```

### 4. 개발 서버 실행

```bash
# 루트에서 동시 실행
pnpm dev

# 또는 개별 실행
pnpm backend:dev      # Medusa :9000
pnpm storefront:dev   # Next.js :8000
```

| 확인 URL | 설명 |
|----------|------|
| http://localhost:9000/app | Admin — Group Deals 메뉴 |
| http://localhost:8000/kr | 랜딩 홈 |
| http://localhost:8000/kr/group-buying | 공동구매 목록 |

### 5. Publishable API Key (필수)

1. Admin → **Settings → Publishable API Keys** → **Create**
2. **`pk_`로 시작하는 토큰** 복사 (Supabase 키 `sb_publishable_` 아님)
3. **Settings → Sales Channels** → Default Sales Channel에 키 연결
4. `.env.local`에 `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` 설정 후 **스토어프론트 재시작**

```bash
curl -H "x-publishable-api-key: pk_여기키" http://localhost:9000/store/regions
```

`regions` JSON이 오면 정상입니다.

---

## 데이터베이스 설정

### 옵션 A — Supabase (권장)

1. [Supabase](https://supabase.com)에서 프로젝트 생성 (Region: Seoul 권장)
2. **Project Settings → Database → Connection string (URI)**
   - **마이그레이션**: Direct connection (포트 `5432`)
   - **앱 실행**: Transaction pooler (포트 `6543`) 권장

```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@....supabase.com:5432/postgres
DATABASE_SSL=true
```

> Admin·스토어에 등록하는 **모든 데이터는 `DATABASE_URL`이 가리키는 DB**에 저장됩니다.  
> 로컬 Postgres → Supabase로 바꾸면 **이전 로컬 데이터는 Admin에 보이지 않습니다.**

### 옵션 B — 로컬 PostgreSQL

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/group_buying
```

---

## Admin에서 공동구매 등록

스토어에 공동구매가 표시되려면 Admin에서 **Group Deal**을 생성하고 상태를 **Open**으로 설정해야 합니다.

| 체크 | 설명 |
|------|------|
| **상태 Open** | `draft`면 스토어 API 목록에 미포함 |
| **총대 보증금** | `deposit_status=deposited` 후 활성화 (`assertDepositBeforeActivate`) |
| **Published 상품** | 연결 product가 Published + Sales Channel + KRW 가격 |
| **Publishable Key** | Default Sales Channel과 연결된 `pk_` 키 |

> **랜딩 페이지 참고:** 백엔드에 open 공구가 없으면 `lib/util/landing-deals.ts`의 `MOCK_DEALS`(BTS, IVE, NewJeans 등 데모 6건)가 표시됩니다. 실데이터를 보려면 Admin에서 공구를 등록하세요.

---

## 공동구매 결제 흐름

### 리전별 결제 수단

| 리전 | Provider | 방식 |
|------|----------|------|
| `kr` | `pp_toss-payments_toss-payments` | Toss 위젯 → **빌링키 예약** |
| 그 외 | `pp_stripe-group-deal_stripe-group-deal` | Stripe **SetupIntent** (off_session) |

분기 로직: `utils/group-deal-payment-provider.ts` — `resolveGroupDealPaymentProviderId()`

### End-to-end

```
1. GET  /store/group-deals/:id              딜 상세
2. POST /store/group-deals/:id/join         prepareGroupDealCheckoutWorkflow → cart + participant(pending)
3. /checkout                                배송지 · 결제 수단
4. POST .../payment-sessions                공동구매 context 주입
5. Toss: billing auth / Stripe: confirmSetup
6. cart.complete → order.placed
7. order-placed-group-deal subscriber
   → confirmGroupDealParticipationWorkflow → participant: reserved
8. group_deal.updated (minimum_reached)
   → group-deal-minimum-reached-capture → captureGroupDealPaymentsWorkflow
9. POST /store/me/group-deals/participations/:id/confirm-delivery
   → confirmParticipantDeliveryWorkflow → 전원 확인 시 settled
```

### 상태 머신

**Deal:** `draft` → `open` → `minimum_reached` → `closed` → `settled` (+ `failed`, `cancelled`)

**Participant:** `pending` → `reserved` → `confirmed` (+ `capture_failed`, `cancelled`)

---

## 스토어프론트 페이지

| URL | 설명 |
|-----|------|
| `/kr` | 랜딩 홈 (`LandingPageTemplate`, API 또는 `MOCK_DEALS`) |
| `/kr/group-buying` | 공동구매 목록 + 필터 |
| `/kr/group-buying/[id]` | 공구 상세 · 참여 · 대기자 |
| `/kr/products/[handle]` | 상품 상세 · 수요조사 |
| `/kr/cart` | 장바구니 |
| `/kr/checkout` | 결제 (Toss / Stripe) |
| `/kr/account` | 계정 개요 |
| `/kr/account/payment-methods` | 저장 결제수단 (Stripe Setup / Toss 빌링) |
| `/kr/account/group-deals/hosted` | 총대(리더) 공구 |
| `/kr/account/group-deals/participations` | 내 참여 · 타임라인 · 수령 확인 |
| `/kr/account/settlements` | 정산 내역 |
| `/kr/account/preferences` | 알림·선호 설정 |

`kr` → `us`, `de` 등 URL 국가 코드로 리전·통화·결제 PG가 결정됩니다.

---

## API 요약

### Store (공개)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/store/group-deals` | 공개 공동구매 목록 |
| GET | `/store/group-deals/:id` | 공동구매 상세 (+ options) |
| POST | `/store/group-deals/:id/join` | 참여 → `cart_id` 반환 |
| POST | `/store/group-deals/:id/waitlist` | 대기자 등록 |
| POST | `/store/group-deals/:id/billing-key` | Toss 빌링키 등록 |
| POST | `/store/products/:id/demand-survey/participate` | 수요조사 참여 |

**Join body 예시:**

```json
{
  "email": "user@example.com",
  "quantity": 1,
  "country_code": "kr",
  "selections": [{ "option_id": "gopt_...", "quantity": 1 }]
}
```

### Store (인증 — `/store/me`)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/store/me/group-deals/hosted` | 총대 공구 목록 |
| GET | `/store/me/group-deals/participations` | 내 참여 목록 |
| POST | `/store/me/group-deals/participations/:id/confirm-delivery` | 수령 확인 |
| GET | `/store/me/group-deals/settlements` | 정산 내역 |
| POST | `/store/me/group-deals/:id/deposit` | 총대 보증금 예치 |
| GET/POST/DELETE | `/store/me/payment-methods` | 저장 결제수단 |
| POST | `/store/me/payment-methods/stripe/setup` | Stripe SetupIntent |
| POST | `/store/me/payment-methods/stripe/complete` | SetupIntent 완료 |
| POST | `/store/me/payment-methods/toss/billing` | Toss 빌링 세션 |
| GET/PUT | `/store/me/preferences` | 알림·선호 설정 |

### Admin

| Method | 경로 | 설명 |
|--------|------|------|
| GET/POST | `/admin/group-deals` | 목록 · 생성 |
| GET/PATCH/DELETE | `/admin/group-deals/:id` | 상세 · 수정 · 삭제 |
| POST | `/admin/group-deals/:id/capture-payments` | 예약 결제 일괄 캡처 |
| POST | `/admin/group-deals/:id/settle` | 정산 |
| POST | `/admin/group-deals/:id/cancel` | 딜 취소 |
| POST | `/admin/group-deals/:id/quote-shipping` | 2차 배송비 견적 |
| POST | `/admin/group-deals/:id/receipt` | 총대 구매 영수증 |
| POST | `/admin/group-deals/:id/tracking` | 송장 업데이트 |

Admin UI: **http://localhost:9000/app** → Group Deals

---

## 환경 변수

### 백엔드 (`apps/backend/.env`)

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `DATABASE_SSL` | Supabase 사용 시 `true` |
| `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` | CORS |
| `JWT_SECRET` / `COOKIE_SECRET` | 인증 시크릿 |
| `TOSS_SECRET_KEY` / `TOSS_CLIENT_KEY` / `TOSS_WEBHOOK_SECRET` | Toss (한국) |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe (해외) |
| `BILLING_KEY_ENCRYPTION_SECRET` | 빌링키 암호화 |
| `GROUP_DEAL_PAYMENT_DEADLINE_HOURS` | 참여 입금 기한 (기본 24) |
| `GROUP_DEAL_MAINTENANCE_CRON` | Cron (기본 `0 * * * *`) |
| `REDIS_URL` | (선택) 프로덕션 권장 |

템플릿: `apps/backend/.env.template`, 배포: `apps/backend/.env.production.template`

### 스토어프론트 (`apps/storefront/.env.local`)

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Admin `pk_` 키 |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | `http://localhost:9000` |
| `NEXT_PUBLIC_DEFAULT_REGION` | `kr` |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:8000` |
| `NEXT_PUBLIC_SITE_NAME` | 사이트명 |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | Toss 클라이언트 키 |
| `NEXT_PUBLIC_STRIPE_KEY` | Stripe publishable key |

템플릿: `apps/storefront/.env.template`

---

## 스크립트

### 루트

| 명령 | 설명 |
|------|------|
| `pnpm dev` | 백엔드 + 스토어프론트 동시 실행 |
| `pnpm backend:dev` | 백엔드만 |
| `pnpm storefront:dev` | 스토어프론트만 |
| `pnpm build` | 전체 빌드 |
| `pnpm start:backend` / `pnpm start:storefront` | 프로덕션 실행 |

### 백엔드 (`apps/backend`)

| 명령 | 설명 |
|------|------|
| `pnpm dev` | Medusa develop (9000) |
| `pnpm db:migrate` | DB 마이그레이션 |
| `pnpm seed:locales` | UI 로케일 |
| `pnpm seed:regions` | 리전 · KRW |
| `pnpm seed:korea-toss` | Toss provider |
| `pnpm seed:stripe` | Stripe group-deal provider |
| `pnpm test:unit` | 단위 테스트 (9 spec) |
| `pnpm test:integration:http` | HTTP 통합 테스트 |

---

## 테스트

백엔드 단위 테스트 (`apps/backend/src/utils/__tests__/`):

- `group-deal-rules`, `group-deal-options`, `group-deal-escrow`
- `group-deal-checkout-payment`, `group-deal-store`, `group-deal-admin-rules`
- `group-deal-deposit-guards`, `toss-payments-client`, `korean-pg-webhook-signature`

```bash
pnpm --filter @dtc/backend test:unit
```

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `A valid publishable key is required` | DB에 없는 `pk_` 또는 Supabase 키 사용 | Admin에서 새 `pk_` 발급 · Sales Channel 연결 |
| 스토어 설정 불러오기 실패 | 위와 동일 | `.env.local` 갱신 후 storefront 재시작 |
| 랜딩에 BTS/IVE 데모만 보임 | DB에 open 공구 없음 | Admin에서 Group Deal 등록 또는 정상(목 데이터) |
| React hydration mismatch (카운트다운) | SSR/CSR 시간 불일치 | `LandingHero` placeholder + `useMounted()` 적용됨 — 캐시 삭제 후 재시작 |
| Admin `-102` / 서버 미기동 | import 경로 오류 등 | `apps/backend`에서 `pnpm dev` 로그 확인 |
| 새 상품이 스토어에 안 보임 | Draft / Sales Channel / KRW 가격 | Admin 체크리스트 참고 |
| Admin 데이터가 사라짐 | DB를 로컬 → Supabase로 변경 | Supabase에서 재등록 또는 dump 복원 |
| `pnpm` / `npx` 오류 (Windows) | PATH · PowerShell 정책 | `npm i -g pnpm`, `npx.cmd` 사용 |

---

## 알려진 제한사항

| 항목 | 현황 |
|------|------|
| **랜딩 Mock 데이터** | open 공구 없을 때 `MOCK_DEALS` 6건 표시, LIVE 티커·후기는 고정 문구 |
| **2차 배송비 결제** | `group-deal-second-payment.ts` 스켈레톤, UI·실제 PG 캡처 미완 |
| **이메일/SMS 알림** | `notification_log` metadata 기록만, 실제 발송 없음 |
| **Toss 빌링 redirect** | 세션 URL 생성까지, callback 저장 미완 |
| **리더 실지급** | `settled` 상태·정산 레코드만, 계좌 이체/PG payout 미연동 |
| **Cron job** | `group-deal-maintenance.ts` dist 로딩 확인 필요 |
| **해외 일반 즉시 결제** | 공동구매용 Stripe SetupIntent만 구현 |

상세 To-Do 목록: **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** §5

---

## GitHub 업로드 시

**올리면 안 되는 것:** `apps/backend/.env`, `apps/storefront/.env.local`, `node_modules/`, `.next/`, `.medusa/`, `dist/`

**올려야 하는 것:** 소스, `.env.template`, `pnpm-lock.yaml`, `README.md`, `PROJECT_STATUS.md`, `DEPLOYMENT.md`

---

## 문서

| 문서 | 설명 |
|------|------|
| **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** | 구현 현황·아키텍처·API·To-Do 상세 |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Vercel + Supabase + Railway 배포 |
| **[CODE_ANALYSIS.md](./CODE_ANALYSIS.md)** | 코드·데이터 흐름 (레거시 분석) |

---

## 라이선스

MIT (Medusa 스타터 기반)
