# Group Buying Site (공동구매몰)

Medusa v2 + Next.js 15 기반 **K-POP 굿즈 / 공동구매** 플랫폼입니다.

| 서비스 | URL |
|--------|-----|
| 쇼핑몰 (고객 화면) | http://localhost:8000/kr |
| 관리자 (Admin) | http://localhost:9000/app |
| 백엔드 API | http://localhost:9000 |

> `http://localhost:9000/` 루트에서 `Cannot GET /`가 보이면 **정상**입니다. Admin은 `/app`으로 접속합니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **공동구매 + 결제** | 한국: Toss 빌링키 예약 / 해외: Stripe SetupIntent 예약 → 목표 달성 시 일괄 캡처 |
| **리전별 결제** | `kr` → Toss, 그 외 → Stripe group-deal provider 자동 분기 |
| **회원가입·로그인** | 6개국어 UI, 이메일 인증 페이지, 가입 후 `/account` 이동 |
| **6개국어 UI** | ko / en / es / ru / zh / ja — 장바구니·결제·계정 포함 |
| **아이돌 굿즈 UI** | 제작 타임라인, 참여율, 특전 해금 게이지 |
| **수요조사** | 상품 metadata + localStorage 기반 (결제와 분리) |
| **브랜딩** | Medusa 노출 문구 제거, `NEXT_PUBLIC_SITE_NAME` / i18n `storeName` 사용 |

---

## 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 백엔드 | Medusa | 2.17.2 |
| 스토어프론트 | Next.js | 15.5.x |
| UI | React | 19.x |
| DB | PostgreSQL (Supabase 권장) | 15+ |
| 결제 (KR) | Toss Payments (빌링키) | 커스텀 provider |
| 결제 (해외) | Stripe SetupIntent (공동구매) | 커스텀 provider |
| 패키지 매니저 | pnpm | 10+ |

---

## 프로젝트 구조

```
group-buying-site/
├── apps/
│   ├── backend/                              # @dtc/backend — Medusa v2
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── group-buying/             # 공동구매 모듈
│   │       │   ├── toss-payments/            # 한국 Toss provider
│   │       │   └── stripe-group-deal/        # 해외 Stripe SetupIntent provider
│   │       ├── workflows/
│   │       │   ├── group-deals.ts            # join · checkout · 참여 확정
│   │       │   └── group-deal-billing.ts     # 빌링키/SetupIntent · 캡처
│   │       ├── subscribers/
│   │       │   ├── confirm-group-deal-participation.ts  # order.placed
│   │       │   └── korean-pg-payment-webhook.ts
│   │       ├── services/
│   │       │   └── group-deal-billing-capture.ts
│   │       ├── api/
│   │       │   ├── store/group-deals/        # GET 목록·상세, POST join
│   │       │   ├── store/payment-collections/ # 결제 세션 + 공동구매 context
│   │       │   └── admin/group-deals/        # Admin CRUD · 캡처
│   │       ├── admin/routes/group-deals/     # Admin UI (공동구매 관리)
│   │       ├── migration-scripts/
│   │       │   └── initial-data-seed.ts      # 초기 상품·리전 시드
│   │       └── scripts/
│   │           ├── seed-locales.ts
│   │           ├── seed-currency-regions.ts
│   │           ├── seed-korea-toss-payment.ts
│   │           └── seed-stripe-payment.ts
│   └── storefront/                           # @dtc/storefront — Next.js 15
│       └── src/
│           ├── app/[countryCode]/            # 국가 코드 라우팅
│           ├── i18n/                         # 6개국어 + account/footer
│           ├── lib/data/                     # cart, customer, group-deals, payment
│           └── modules/
│               ├── group-buying/             # 공동구매 UI
│               ├── checkout/                   # Toss / Stripe 분기 결제
│               ├── account/                    # 로그인 · 회원가입 · 인증
│               └── layout/                     # Nav, Footer (사이트명 i18n)
├── DEPLOYMENT.md                             # Vercel + Supabase 배포
├── CODE_ANALYSIS.md
└── README.md
```

---

## 시작하기

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

### 2. 데이터베이스 설정

#### 옵션 A — Supabase (권장, 배포와 동일 DB)

1. [Supabase](https://supabase.com)에서 프로젝트 생성 (Region: Seoul 권장)
2. **Project Settings → Database → Connection string (URI)**
   - **마이그레이션**: Direct connection (포트 `5432`)
   - **앱 실행**: Transaction pooler (포트 `6543`) 권장

`apps/backend/.env`:

```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@....supabase.com:5432/postgres
DATABASE_SSL=true
```

> Admin·스토어에 등록하는 **모든 데이터는 `DATABASE_URL`이 가리키는 DB**에 저장됩니다.  
> 로컬 Postgres → Supabase로 바꾸면 **이전에 로컬에만 있던 데이터는 Admin에 보이지 않습니다.** Supabase에서 다시 등록하거나 `pg_dump`로 이전하세요.

#### 옵션 B — 로컬 PostgreSQL

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/group_buying
# DATABASE_SSL=  (비우거나 false)
```

```bash
cp apps/backend/.env.template apps/backend/.env
# DATABASE_URL 등 수정
```

### 3. DB 마이그레이션 · 시드 · 관리자

```bash
cd apps/backend

pnpm db:migrate              # 테이블 생성 + initial-data-seed
pnpm medusa user -e admin@test.com -p supersecret
pnpm seed:locales            # UI 로케일 6개
pnpm seed:regions            # Korea / America 리전 + KRW 가격
pnpm seed:korea-toss           # 한국 Toss 결제 provider
pnpm seed:stripe             # 해외 Stripe group-deal provider
```

### 4. 백엔드 실행

```bash
cd apps/backend
pnpm dev
```

`Server is ready on port 9000` → http://localhost:9000/app

### 5. Publishable API Key (필수)

1. Admin → **Settings → Publishable API Keys** → **Create**
2. **`pk_`로 시작하는 토큰** 복사 (Supabase 키 `sb_publishable_` 아님)
3. **Settings → Sales Channels** → Default Sales Channel에 키 연결

### 6. 스토어프론트 설정

```bash
cp apps/storefront/.env.template apps/storefront/.env.local
```

`apps/storefront/.env.local`:

```env
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_DEFAULT_REGION=kr
NEXT_PUBLIC_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SITE_NAME=공동구매몰

# 결제 테스트 시
# NEXT_PUBLIC_TOSS_CLIENT_KEY=
# NEXT_PUBLIC_STRIPE_KEY=
```

```bash
cd apps/storefront
pnpm dev
```

쇼핑몰: http://localhost:8000/kr

> `.env.local` 변경 후 **스토어프론트 재시작** 필요 (`NEXT_PUBLIC_*`).

### 7. API 연결 확인

```bash
curl -H "x-publishable-api-key: pk_여기키" http://localhost:9000/store/regions
```

`regions` JSON이 오면 정상. `A valid publishable key is required` → Admin에서 **새 `pk_` 발급** (Supabase DB 기준).

---

## Admin에서 상품 등록 (스토어 노출)

스토어 API는 **Published** + **Default Sales Channel** + **리전 가격**이 있는 상품만 표시합니다.

| 체크 | 설명 |
|------|------|
| **Published** | Draft면 스토어에 안 보임 |
| **Sales Channel** | Default Sales Channel에 연결 |
| **KRW 가격** | `/kr` 접속 시 variant에 KRW 금액 필요 |
| **Publishable Key** | Default Sales Channel과 연결된 `pk_` 키 |

공동구매 페이지(`/kr/group-buying/[id]`)에 나오려면 **Group Deal**을 Admin에서 별도 생성하고 상태를 **Open**으로 설정하세요.

---

## 공동구매 결제 흐름

### 리전별 결제 수단

| 리전 | Provider | 방식 |
|------|----------|------|
| `kr` | `pp_toss-payments_toss-payments` | Toss 위젯 → **빌링키 예약** |
| 그 외 | `pp_stripe-group-deal_stripe-group-deal` | Stripe **SetupIntent** (카드 저장만) |

목표 인원(`minimum_reached`) 또는 마감(`closed`) 시 `captureGroupDealPayments`로 **일괄 실결제**합니다.

### End-to-end

```
1. GET  /store/group-deals/:id          딜 상세
2. POST /store/group-deals/:id/join     장바구니 + participant(pending)
3. /checkout                            배송지 · 결제 수단
4. POST .../payment-sessions            공동구매 context 주입 → Toss/Stripe 예약 모드
5. Toss: billing auth / Stripe: confirmSetup
6. cart.complete (placeOrder)
7. order.placed → confirmGroupDealParticipationWorkflow
   → participant: RESERVED (또는 CONFIRMED)
   → 딜 지표 재계산 · 필요 시 캡처
```

### 딜 상태

```
draft → open → minimum_reached → closed
              ↘ failed
              ↘ cancelled
```

### 참여자 상태

| status | 의미 |
|--------|------|
| `pending` | join 후 결제 전 |
| `reserved` | 빌링키/Stripe PM 저장, 캡처 대기 |
| `confirmed` | 결제 확정 |
| `cancelled` | 취소 |

---

## 회원가입 · 계정

| URL | 설명 |
|-----|------|
| `/kr/account` | 로그인 / 회원가입 |
| `/kr/account/profile` | 프로필 (로그인 후) |
| `/kr/verify-account?token=...` | 이메일 인증 |

- UI 문자열: `i18n` `account` 섹션 (6개국어)
- 가입·로그인 성공 시 `/account`로 이동
- 데이터 저장: Supabase `auth_identity`, `customer`, `customer_address` 등 (백엔드 `DATABASE_URL` 기준)

---

## API 요약

### Store

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/store/group-deals` | 공개 공동구매 목록 |
| GET | `/store/group-deals/:id` | 공동구매 상세 (+ options) |
| POST | `/store/group-deals/:id/join` | 참여 → `cart_id` 반환 |
| POST | `/store/payment-collections/:id/payment-sessions` | 결제 세션 (공동구매 context 포함) |
| POST | `/store/payment-collections/:id/payment-sessions/:session_id` | Toss `authKey` 등 병합 |

**Join body 예시:**

```json
{
  "email": "user@example.com",
  "quantity": 1,
  "country_code": "kr"
}
```

### Admin

| Method | 경로 | 설명 |
|--------|------|------|
| GET/POST | `/admin/group-deals` | 목록 · 생성 |
| GET/PATCH/DELETE | `/admin/group-deals/:id` | 상세 · 수정 · 삭제 |
| POST | `/admin/group-deals/:id/capture-payments` | 예약 결제 일괄 캡처 |
| POST | `/admin/group-deals/:id/cancel` | 딜 취소 |

Admin UI: **http://localhost:9000/app** → Group Deals 메뉴

---

## 스토어프론트 페이지

| URL | 설명 |
|-----|------|
| `/kr` | 홈 (출판 상품 그리드) |
| `/kr/products/[handle]` | 상품 상세 |
| `/kr/group-buying` | 공동구매 목록 |
| `/kr/group-buying/[id]` | 공동구매 상세 · 참여 |
| `/kr/cart` | 장바구니 |
| `/kr/checkout` | 결제 |
| `/kr/account` | 로그인 · 회원가입 |

`kr` → `us`, `de` 등 URL 국가 코드로 리전·통화가 결정됩니다.

---

## 환경 변수

### 백엔드 (`apps/backend/.env`)

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL (Supabase URI) |
| `DATABASE_SSL` | Supabase 사용 시 `true` |
| `STORE_CORS` | `http://localhost:8000` |
| `ADMIN_CORS` / `AUTH_CORS` | Admin·인증 CORS |
| `JWT_SECRET` / `COOKIE_SECRET` | 인증 시크릿 |
| `TOSS_SECRET_KEY` / `TOSS_CLIENT_KEY` | Toss (한국) |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | Stripe (해외) |
| `BILLING_KEY_ENCRYPTION_SECRET` | 빌링키 암호화 |
| `REDIS_URL` | (선택) 프로덕션 권장 |

### 스토어프론트 (`apps/storefront/.env.local`)

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Admin `pk_` 키 |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | `http://localhost:9000` |
| `NEXT_PUBLIC_DEFAULT_REGION` | `kr` |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:8000` |
| `NEXT_PUBLIC_SITE_NAME` | 사이트명 (기본: 공동구매몰) |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | Toss 클라이언트 키 |
| `NEXT_PUBLIC_STRIPE_KEY` | Stripe publishable key |

배포용 템플릿: `apps/backend/.env.production.template`, `DEPLOYMENT.md`

---

## 스크립트

### 루트

| 명령 | 설명 |
|------|------|
| `pnpm dev` | 백엔드 + 스토어프론트 동시 실행 |
| `pnpm backend:dev` | 백엔드만 |
| `pnpm storefront:dev` | 스토어프론트만 |
| `pnpm build` | 전체 빌드 |

### 백엔드 (`apps/backend`)

| 명령 | 설명 |
|------|------|
| `pnpm dev` | Medusa develop (9000) |
| `pnpm db:migrate` | 마이그레이션 + initial seed |
| `pnpm seed:locales` | UI 로케일 |
| `pnpm seed:regions` | 리전 · KRW |
| `pnpm seed:korea-toss` | Toss provider |
| `pnpm seed:stripe` | Stripe group-deal provider |
| `pnpm test:unit` | 단위 테스트 |

---

## i18n · 브랜딩

- **6개국어**: ko, en, es, ru, zh, ja — `account`, `footer`, `checkout`, `cart` 포함
- **사이트명**: `NEXT_PUBLIC_SITE_NAME` + i18n `nav.storeName` (Medusa Store 문구 제거)
- **상품명**: Admin 등록 원본 유지 (K-POP 고유명사)
- **상품 설명**: 외국어 UI에서 MyMemory API 번역 (선택)

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `A valid publishable key is required` | DB에 없는 `pk_` 또는 Supabase 키 사용 | Admin에서 새 `pk_` 발급 · Sales Channel 연결 |
| 스토어 설정 불러오기 실패 | 위와 동일 | `.env.local` 갱신 후 storefront 재시작 |
| 새 상품이 스토어에 안 보임 | Draft / Sales Channel / KRW 가격 | Admin 체크리스트 참고 |
| Admin 데이터가 사라짐 | DB를 로컬 → Supabase로 변경 | Supabase에서 재등록 또는 dump 복원 |
| `pnpm` / `npx` 오류 (Windows) | PATH · PowerShell 정책 | `npm i -g pnpm`, `npx.cmd` 사용 |
| Supabase `ENOTFOUND` | Pause / 잘못된 URL | Supabase Restore · Direct URL(5432) |

---

## 알려진 제한사항

- **2차 배송비 결제** (`split_product_shipping`): DB 필드만 준비, UI·워크플로 미완
- **해외 일반 상품 즉시 결제**: 공동구매용 Stripe SetupIntent만 구현 (일반 Stripe checkout 별도)
- **이메일 인증 발송**: notification provider 설정 필요 (개발 환경에서는 UI만 동작할 수 있음)
- `/group-buying` 목록은 API 목록 + 출판 상품 그리드 혼합 — Admin에서 Group Deal Open 상태 필요

---

## GitHub 업로드 시

**올리면 안 되는 것:** `apps/backend/.env`, `apps/storefront/.env.local`, `node_modules/`, `.next/`, `dist/`

**올려야 하는 것:** 소스, `.env.template`, `pnpm-lock.yaml`, `README.md`, `DEPLOYMENT.md`

---

## 문서

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Vercel + Supabase + Railway 배포
- **[CODE_ANALYSIS.md](./CODE_ANALYSIS.md)** — 코드·데이터 흐름 상세

---

## 라이선스

MIT (Medusa 스타터 기반)
