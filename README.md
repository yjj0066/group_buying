# Group Buying Site (공동구매몰)

Medusa v2 + Next.js 15 기반 **K-POP 굿즈 / 공동구매** 플랫폼입니다.

| 서비스 | URL |
|--------|-----|
| 쇼핑몰 (고객 화면) | http://localhost:8000/kr |
| 관리자 (Admin) | http://localhost:9000/app |
| 백엔드 API | http://localhost:9000 |

> `http://localhost:9000/` 루트에서 `Cannot GET /`가 보이면 **정상**입니다. API 서버라 루트 페이지가 없고, Admin은 `/app`으로 접속합니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 공동구매 (결제 연동) | 참여 → 장바구니 생성 → 결제 완료 시 참여 확정 (`/group-buying/[id]`) |
| 수요조사 | 상품 상세 타임라인에서 관심 표시 참여 (metadata 기반) |
| 아이돌 굿즈 UI | 제작 타임라인, 실시간 참여율, 특전 해금 게이지 |
| 6개국어 UI | 한국어, 영어, 스페인어, 러시아어, 중국어, 일본어 |
| 통화 선택 | 헤더에서 KRW/USD 등 통화(리전) 선택 — 언어와 독립 |
| 장바구니·결제 i18n | 장바구니, 결제, 주문 확인 화면도 선택 언어로 표시 |
| 상품명 원본 고정 | K-POP 고유명사 보호 — 상품명은 Admin 등록 그대로 표시 |
| 일반 커머스 | 장바구니, 결제(Stripe/수동결제), 계정, 주문 (Medusa 기본) |

---

## 최근 변경 사항 요약

### 1. 통화 선택기 (Currency Selector)

- 헤더에 **통화/리전 선택** 드롭다운 추가 (`CurrencySelect`)
- 언어 설정과 **독립** — `/kr`(KRW), `/us`(USD) 등 URL 국가 코드로 가격·통화 결정
- 언어는 `_medusa_locale` 쿠키로 관리 (예: `/kr` + 영어 UI 동시 가능)
- 백엔드에 Korea/America 리전 및 KRW 가격 시드 지원

### 2. 공동구매 v1 → v2 마이그레이션 (결제 연동)

이전에는 이메일·수량만 기록했으나, 현재는 **결제 완료 후 참여 확정** 방식입니다.

```
참여 버튼 → POST /store/group-deals/:id/join
         → deal_price 장바구니 생성
         → /checkout 결제
         → order.placed 이벤트
         → 참여자 confirmed + 딜 지표 재계산
```

**딜 상태 머신:**

```
draft → open → minimum_reached → closed
              ↘ failed
              ↘ cancelled
```

| 상태 | 의미 |
|------|------|
| `open` | 참여 가능 |
| `minimum_reached` | 최소 인원 달성 (`current_participants >= min_participants`) |
| `closed` | 수량 소진 또는 기간 종료 |
| `failed` | 기한 내 최소 인원 미달 |
| `cancelled` | 수동 취소 |

**참여율:** `current_participants / min_participants` (결제 완료된 고유 고객 수)

### 3. 장바구니·결제 다국어 (i18n)

- 결제 레이아웃에 `I18nProvider` 적용
- 장바구니·결제·주문 확인 UI 문자열 6개 언어 사전으로 교체
- 결제 수단명(신용카드, 수동 결제 등)도 선택 언어로 표시
- 페이지 탭 제목(장바구니, 결제)도 언어에 맞게 생성

### 4. 백엔드 시드·리전

- `pnpm seed:regions` — Korea/America 리전 및 KRW 가격 생성
- `pnpm seed:locales` — 6개 UI 로케일 등록
- Medusa Translation 모듈 활성화 (상품명은 의도적으로 원본 유지)

---

## 프로젝트 구조

```
group-buying-site/
├── apps/
│   ├── backend/                         # @dtc/backend — Medusa v2
│   │   └── src/
│   │       ├── modules/group-buying/    # 공동구매 커스텀 모듈
│   │       │   ├── models/              # GroupDeal, GroupDealParticipant
│   │       │   ├── service.ts           # 딜 지표 재계산, 참여 검증
│   │       │   └── migrations/          # DB 마이그레이션
│   │       ├── workflows/
│   │       │   ├── group-deals.ts       # 참여·결제·확정 워크플로
│   │       │   └── demand-survey.ts     # 수요조사 워크플로
│   │       ├── subscribers/
│   │       │   └── order-placed-group-deal.ts  # 결제 완료 시 참여 확정
│   │       ├── api/
│   │       │   ├── store/group-deals/   # 공개 API
│   │       │   └── admin/group-deals/   # 관리자 API
│   │       ├── utils/group-deal-rules.ts # 상태 머신·참여 규칙
│   │       ├── migration-scripts/
│   │       │   └── initial-data-seed.ts # 초기 상품·리전 시드
│   │       └── scripts/
│   │           ├── seed-locales.ts
│   │           └── seed-currency-regions.ts
│   └── storefront/                      # @dtc/storefront — Next.js 15
│       └── src/
│           ├── app/[countryCode]/       # 국가 코드 기반 라우팅
│           ├── i18n/                    # 6개국어 사전 + Provider
│           ├── lib/data/                # 서버 액션 (cart, group-deals 등)
│           └── modules/
│               ├── group-buying/        # 공동구매 UI
│               ├── cart/                # 장바구니 (i18n 적용)
│               ├── checkout/            # 결제 (i18n 적용)
│               └── layout/
│                   └── components/
│                       ├── currency-select/    # 통화 선택
│                       └── language-switcher/  # 언어 선택
├── package.json
├── pnpm-workspace.yaml
├── CODE_ANALYSIS.md
└── DEPLOYMENT.md
```

---

## 시작하기

### 필요 환경

- **Node.js** v20 이상
- **PostgreSQL** v15 이상
- **pnpm** v10 이상

### 1. 저장소 클론 및 의존성 설치

```bash
git clone https://github.com/yjj0066/group_buying.git
cd group_buying
pnpm install
```

### 2. 백엔드 환경 설정

```bash
cp apps/backend/.env.template apps/backend/.env
```

`apps/backend/.env`에서 `DATABASE_URL`을 본인 PostgreSQL에 맞게 수정:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/group_buying
```

### 3. DB 마이그레이션 · 시드 · 관리자 계정

```bash
cd apps/backend
pnpm db:migrate          # 모듈 마이그레이션 + initial-data-seed 자동 실행
pnpm medusa user -e admin@test.com -p supersecret
pnpm seed:locales        # 6개 UI 로케일 등록
pnpm seed:regions        # Korea/America 리전 + KRW 가격
```

### 4. 백엔드 실행

```bash
cd apps/backend
pnpm dev
```

`Server is ready on port 9000` 확인 후 Admin 접속: **http://localhost:9000/app**

> `medusa develop`은 시작 전 ESLint를 자동 실행합니다. 서비스 클래스 public 메서드는 `async`여야 합니다.

### 5. 스토어프론트 환경 설정

```bash
cp apps/storefront/.env.template apps/storefront/.env.local
```

Admin (`/app`) → Settings → Publishable API Keys에서 키 발급 후 설정:

```env
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_DEFAULT_REGION=kr
NEXT_PUBLIC_BASE_URL=http://localhost:8000
```

### 6. 스토어프론트 실행

```bash
cd apps/storefront
pnpm dev
```

쇼핑몰 접속: **http://localhost:8000/kr**

### 루트에서 동시 실행 (선택)

```bash
# group-buying-site 루트에서
pnpm dev
```

---

## 스크립트 참고

### 루트 (`group-buying-site/`)

| 명령 | 설명 |
|------|------|
| `pnpm dev` | 백엔드 + 스토어프론트 동시 실행 |
| `pnpm backend:dev` | 백엔드만 실행 |
| `pnpm storefront:dev` | 스토어프론트만 실행 |
| `pnpm build` | 전체 빌드 |
| `pnpm lint` | 전체 린트 |

### 백엔드 (`apps/backend/`)

| 명령 | 설명 |
|------|------|
| `pnpm dev` | `medusa develop` (포트 9000) |
| `pnpm db:migrate` | DB 마이그레이션 + 초기 시드 |
| `pnpm seed:locales` | UI 로케일 6개 등록 |
| `pnpm seed:regions` | 리전·KRW 가격 시드 |
| `pnpm lint` | ESLint (`medusa lint`) |
| `pnpm build` | 프로덕션 빌드 |

### 스토어프론트 (`apps/storefront/`)

| 명령 | 설명 |
|------|------|
| `pnpm dev` | Next.js 개발 서버 (포트 8000) |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 프로덕션 서버 시작 |

---

## 아키텍처

### 언어 vs 통화 (독립 설계)

```
┌─────────────────────────────────────────────────────┐
│  언어 (UI 텍스트)                                     │
│  _medusa_locale 쿠키 → i18n 사전 → 화면 문자열        │
│  장바구니·결제·네비게이션 포함                         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  통화 (가격·결제)                                     │
│  URL /{countryCode}/ → Medusa Region → currency_code │
│  CurrencySelect로 /kr ↔ /us 전환                     │
└─────────────────────────────────────────────────────┘
```

예: `/kr` URL + 영어 UI → **KRW 가격**으로 **영어 화면** 표시

### 공동구매 참여 흐름

```
1. /kr/group-buying/[id]  →  딜 상세 + 참여 폼
2. 참여 버튼 클릭
   POST /store/group-deals/:id/join
   { email, quantity, country_code }
3. prepareGroupDealCheckoutWorkflow
   - 참여 가능 여부 검증 (상태·기간·수량)
   - participant 생성 (status: pending)
   - deal_price로 장바구니·라인아이템 생성
4. /kr/checkout 리다이렉트 → 결제
5. 주문 완료 (order.placed)
   confirmGroupDealParticipationWorkflow
   - participant → confirmed
   - current_participants / current_quantity 재계산
   - 딜 상태 갱신 (minimum_reached, closed 등)
```

### 수요조사 (별도 시스템)

공동구매 DB 모듈과 **분리**되어 있습니다.

- 데이터: `product.metadata` (participation_current, production_stage 등)
- 참여 ID: 클라이언트 localStorage
- API: `POST /store/products/:id/demand-survey/participate`

---

## 공동구매 데이터 모델

### GroupDeal (`group_deal`)

| 필드 | 설명 |
|------|------|
| `min_participants` | 최소 참여 인원 (고유 결제 고객) |
| `current_participants` | 현재 확정 참여 인원 |
| `target_quantity` | 목표 수량 (특전 게이지용) |
| `current_quantity` | 현재 확정 수량 합계 |
| `max_quantity` | 최대 판매 수량 (null = 무제한) |
| `deal_price` / `original_price` | 할인가 / 정가 |
| `status` | `open` · `minimum_reached` · `closed` · `failed` · `cancelled` |
| `starts_at` / `ends_at` | 참여 가능 기간 |

### GroupDealParticipant (`group_deal_participant`)

| 필드 | 설명 |
|------|------|
| `email` / `customer_id` | 참여자 식별 |
| `quantity` | 참여 수량 |
| `status` | `pending` → `confirmed` (결제 후) · `cancelled` |
| `cart_id` | 결제 준비 시 생성된 장바구니 |
| `order_id` | 확정된 주문 ID |

---

## API 엔드포인트

### Store (공개)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/store/group-deals` | 참여 가능한 공동구매 목록 |
| GET | `/store/group-deals/:id` | 공동구매 상세 |
| POST | `/store/group-deals/:id/join` | 참여 → 장바구니 생성 |
| POST | `/store/products/:id/demand-survey/participate` | 수요조사 참여 |

**Join 요청 body:**

```json
{
  "email": "user@example.com",
  "quantity": 1,
  "country_code": "kr"
}
```

**Join 응답:**

```json
{
  "cart_id": "cart_...",
  "participant": { ... },
  "group_deal": { ... },
  "checkout_path": "/checkout"
}
```

### Admin

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/admin/group-deals` | 공동구매 목록 |
| POST | `/admin/group-deals` | 공동구매 생성 |
| GET | `/admin/group-deals/:id` | 공동구매 상세 |

---

## 스토어프론트 페이지

| URL | 설명 |
|-----|------|
| `/kr` | 홈 |
| `/kr/products/[handle]` | 상품 상세 (아이돌 굿즈 UI) |
| `/kr/group-buying` | 공동구매 목록 |
| `/kr/group-buying/[id]` | 공동구매 상세 + 참여 |
| `/kr/cart` | 장바구니 |
| `/kr/checkout` | 결제 (배송지 → 배송 → 결제 → 확인) |

`kr` 대신 `us`, `de` 등 리전별 국가 코드 사용 가능.

---

## Admin에서 상품·수요조사 설정

상품 Metadata에 아래 값을 설정하면 아이돌 굿즈 UI가 동작합니다.

| Metadata 키 | 값 예시 | 설명 |
|-------------|---------|------|
| `production_stage` | `demand_survey` | 제작 단계 |
| `participation_current` | `42` | 현재 참여 인원 |
| `participation_target` | `100` | 목표 인원 |

`production_stage` 값:

- `demand_survey` — 수요조사
- `pre_deposit` — 선입금 진행
- `general_deposit` — 일반입금
- `in_production` — 제작 진행 중
- `shipping` — 배송 시작

---

## 환경 변수

### 백엔드 (`apps/backend/.env`)

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 |
| `STORE_CORS` | 스토어프론트 CORS (기본: `http://localhost:8000`) |
| `JWT_SECRET` / `COOKIE_SECRET` | 인증 시크릿 (배포 시 변경 필수) |
| `REDIS_URL` | (선택) Redis — 없으면 in-memory |

### 스토어프론트 (`apps/storefront/.env.local`)

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Publishable API Key |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | Medusa API URL |
| `NEXT_PUBLIC_DEFAULT_REGION` | 기본 국가 코드 (기본: `kr`) |
| `NEXT_PUBLIC_BASE_URL` | 스토어프론트 공개 URL |
| `NEXT_PUBLIC_STRIPE_KEY` | (선택) Stripe 공개 키 |

---

## i18n (다국어)

### 지원 언어

| UI 로케일 | 언어 |
|-----------|------|
| `ko-KR` | 한국어 (기본) |
| `en-US` | 영어 |
| `es-ES` | 스페인어 |
| `ru-RU` | 러시아어 |
| `zh-CN` | 중국어 |
| `ja-JP` | 일본어 |

### 적용 범위

- 네비게이션, 홈, 상품 목록/상세
- 공동구매 페이지
- **장바구니** (제목, 요약, 결제하기 버튼 등)
- **결제** (배송지, 배송 방법, 결제 수단, 주문 확인)
- 결제 수단명 (신용카드, 수동 결제 등)

### 상품명 정책

- 상품 **이름**은 Admin 등록 원본 유지 (K-POP 고유명사 보호)
- 상품 **설명**은 외국어 UI 선택 시 MyMemory API로 번역 (한국어 UI는 원본)
- Store API에 `x-medusa-locale` 헤더를 보내지 않아 Medusa Translation이 상품명을 덮어쓰지 않음

---

## GitHub에 올릴 때 주의

### 올려야 하는 것

- 소스 코드 전체 (`apps/`, `package.json`, `pnpm-lock.yaml` 등)
- `.env.template` 파일들
- `README.md`, `CODE_ANALYSIS.md`, `DEPLOYMENT.md`

### 절대 올리면 안 되는 것

| 파일 | 이유 |
|------|------|
| `apps/backend/.env` | DB 비밀번호, JWT 시크릿 |
| `apps/storefront/.env.local` | Publishable API Key |
| `node_modules/` | `pnpm install`로 재생성 |
| `.next/`, `build/`, `dist/` | 빌드 결과물 |

---

## 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 백엔드 | Medusa | 2.17.2 |
| 스토어프론트 | Next.js | 15.5.18 |
| UI | React | 19.0.5 |
| 스타일 | Tailwind CSS | 3.x |
| 결제 | Stripe / 수동 결제 | — |
| DB | PostgreSQL | 15+ |
| 패키지 매니저 | pnpm | 10.11.1 |

---

## 알려진 제한사항

- `/group-buying` 목록 페이지는 공동구매 API(`listGroupDeals`)가 아닌 **전체 출판 상품**을 표시합니다.
- Admin UI에서 공동구매를 관리하는 화면은 아직 없습니다 (API로만 생성·조회 가능).
- Admin 공동구매 수정·삭제 API는 아직 구현되지 않았습니다.
- 상품 설명 번역은 MyMemory API를 사용합니다 (무료 한도·품질 제한 있음).
- 수요조사는 metadata + localStorage 기반이라 결제 흐름과 연동되지 않습니다.

---

## 문서

- **[CODE_ANALYSIS.md](./CODE_ANALYSIS.md)** — 코드 구조·데이터 흐름 분석
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Vercel + Railway/Render 배포 가이드

---

## 라이선스

MIT (Medusa 스타터 기반)
