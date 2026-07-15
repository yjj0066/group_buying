# Group Buying Site (아이돌 공구몰)

Medusa v2 + Next.js 15 기반 **K-POP 굿즈 공동구매(Group Deal)** 플랫폼입니다.  
총대(리더) 보증금, 참여자 예약 결제(PG 에스크로) 및 가상계좌 입금, 멤버별 자리 선택, 대기자(waitlist) 매칭, 수령 확인 후 정산까지 공동구매 특화 도메인을 Medusa 커스텀 모듈로 구현했습니다.

**GitHub:** https://github.com/yjj0066/group_buying

> **기준 문서:** `아이돌공구-기능정의서 (2).xlsx` (v3) 및 v2 Excel 스펙  
> 추출본: `_spec_extract_v3.txt` (v3), `_spec_extract_v2.txt` (v2)

| 서비스 | URL |
|--------|-----|
| 랜딩 홈 | http://localhost:8000/kr |
| 전체 상품·검색 | http://localhost:8000/kr/store |
| 공동구매 목록 (SRCH) | http://localhost:8000/kr/group-buying |
| 공구 상세 (DETL) | http://localhost:8000/kr/group-buying/{id} |
| 가상계좌 입금 (CHKO) | http://localhost:8000/kr/group-buying/{id}/deposit |
| 마이페이지 | http://localhost:8000/kr/account |
| 총대 신뢰·후기 (MTRS) | http://localhost:8000/kr/account/trust-reviews |
| Admin | http://localhost:9000/app |
| Medusa API | http://localhost:9000 |
| Flask AI (선택) | http://localhost:5000 |

> `http://localhost:9000/` 에서 `Cannot GET /` 가 보이면 **정상**입니다. Admin은 `/app` 으로 접속합니다.

---

## 최근 반영 사항 (2026-07-15)

### P2 — AI·신뢰·총대 대시보드

| 스펙 | 기능 | 주요 파일 |
|------|------|-----------|
| **HOME-03** | 최애 아이돌 기반 랜딩 추천 + 마감임박·인기 정렬 | `landing-deals.ts`, `landing-page/`, `AiRecommendationSlider` |
| **DASH-05** | 총대 공구 대시보드 AI 단가 추천 (공석률·충원율 기반) | `group-deal-price-recommendations.ts`, `price-recommendations` / `apply-price-recommendations` API, `ai-price-recommendation-panel` |
| **MTRS-01** | 총대 신뢰 프로필·후기·신고 | `leader-trust-profile.ts`, `GET /store/me/trust-profile`, `/account/trust-reviews` |

### P0/P1 — v3 스펙 보완

| 영역 | 반영 내용 |
|------|-----------|
| **상태 정합성** | `GroupDealStatus.ACTIVE` 제거 → **`OPEN`으로 통일** (백엔드·스토어프론트) |
| **CHKO** | join 시 VA 발급, 5분 `payment_deadline`, `/deposit` 리다이렉트, 입금 확인 stub |
| **HOME-01** | 로그인 사용자 역할별 홈 분기 — 총대 → hosted, 참여자 → group-buying |
| **MYJN** | 참여 후기·분쟁 API, 7단계 타임라인(`opening` 포함), 수령 확인 API |
| **ACCT** | 환불 계좌, `preferred_role` 역할 전환, 긴급 모집(QFIL) API |
| **정산·유지보수** | `GET /store/me/group-deals/settlements`, cron `autoConfirmOverdueDeliveries` (D+7) |
| **Admin** | 영수증 Verify/Reject Medusa JS SDK 인증 (401 수정), AI 영수증 stub |

### 개발 성능 최적화

| 항목 | 내용 |
|------|------|
| **Flask 기본 OFF (dev)** | `SEARCH_API_ENABLED=false` — Flask 미기동 시 2.5s 타임아웃 방지 |
| **Flask 타임아웃** | dev **800ms** / prod **2500ms** (`getFlaskRequestTimeoutMs`) |
| **랜딩 중복 fetch 제거** | 비로그인 시 preferences 미호출, `initialCustomer` props 전달 |
| **Turbopack** | `pnpm dev` 기본 `--turbopack` (`dev:webpack` 폴백) |
| **Middleware** | region fetch 타임아웃 dev **2s** (prod 5s), fallback region map |

### Flask 하이브리드 AI 연동

| 영역 | 내용 |
|------|------|
| **상품 검색** | `/store?q=` — Flask `GET /api/v1/products/search` 전용 (동의어·의미 검색) |
| **AI 추천 슬라이더** | 랜딩 Hero 아래(마감 임박·인기·최애), 상품/공구 상세 하단(유사 공구) |
| **행동 로그** | 검색 클릭·장바구니·공구 결제 → Flask 로그 API 비동기 전송 (실패해도 UX 차단 없음) |
| **BFF** | `/api/ai/search`, `/api/ai/recommendations`, `/api/ai/events` |
| **색인 피드** | `GET /store/products/search-index` — Flask 쪽 상품 동기화용 |

---

## 주요 기능

### 공동구매 도메인

| 기능 | 설명 |
|------|------|
| **공동구매 + 예약 결제** | KR: Toss 빌링키 / 해외: Stripe SetupIntent → `minimum_reached` 시 일괄 캡처 |
| **가상계좌 입금 (v3)** | join 시 VA 발급 → `/group-buying/{id}/deposit` — 5분 홀드 |
| **총대 보증금** | `deposit_status=deposited` — 목록 노출·신뢰 배지 |
| **총대 신뢰도 UI** | 첫 공구: "처음 공동구매 총대" / 경험자: N번째 총대 + 신뢰 라벨 |
| **총대 신뢰·후기 (MTRS)** | 완료 공구·평점·분쟁·보증금 몰수 통계, 후기 신고 |
| **AI 단가 추천 (DASH)** | 멤버 옵션별 공석률·충원율 기반 권장가, 일괄 적용 API |
| **에스크로·공석 처리** | 미결제 만료·취소 시 슬롯 해제, waitlist 자동 매칭 |
| **멤버/버전 옵션** | `GroupDealOption` — DETL 자리 선택 UI → join API `selections` |
| **수요조사** | 상품 metadata 기반 (결제와 분리) |

### 스토어프론트

| 기능 | 설명 |
|------|------|
| **프리미엄 랜딩** | 인기·마감임박·카테고리 + **최애 아이돌 기반 AI 추천** |
| **역할별 홈 (HOME-01)** | 로그인 총대 → hosted 대시보드, 참여자 → 공구 목록 |
| **Flask 검색** | Nav 검색바 → `/store?q=` → Flask semantic search |
| **공구 목록·상세** | 필터·신뢰 패널·타임라인·영수증·가상계좌·유사 공구 추천 |
| **총대 대시보드** | hosted/[id] — 충원율·공석·AI 단가 추천 패널 |
| **상품 → 공구 UI** | 연결 공구 있으면 redirect, 없으면 DETL 미리보기 |
| **마이페이지** | 결제수단, 총대/참여, 환불 계좌, 정산, 신뢰·후기, 알림·역할 설정 |
| **6개국어 UI** | ko / en / es / ru / zh / ja |
| **행동 로그** | 검색 클릭·장바구니·공구 결제 — fire-and-forget |

### 운영·백오피스

| 기능 | 설명 |
|------|------|
| **Admin UI** | `src/admin/routes/group-deals/` — CRUD, 리더 관리·영수증 검증 |
| **Cron job** | `group-deal-maintenance.ts` — 미결제 만료, `ends_at` 경과 `CLOSED`, D+7 자동 수령 확인 |
| **알림 (개발)** | `notification_log` metadata 기록 (실제 이메일/SMS 미연동) |

---

## Flask 하이브리드 API

Medusa는 **결제·주문·재고**만 담당하고, Flask는 **검색·추천·로그**만 담당합니다. Flask 장애 시 상품 검색·추천 UI는 숨김 처리되며, 장바구니·결제 흐름은 영향받지 않습니다.

**로컬 개발:** Flask는 **기본 비활성** (`SEARCH_API_ENABLED=false`). Flask를 `:5000`에서 기동한 뒤 `SEARCH_API_ENABLED=true`로 켜세요.

### Storefront → Flask

| 용도 | Flask API | Storefront |
|------|-----------|------------|
| Health | `GET /api/v1/health` | — |
| 검색 | `GET /api/v1/products/search?q=` | `lib/data/flask-search.ts`, `/store` |
| 검색 클릭 | `POST /api/v1/products/search/click` | `lib/util/flask-behavior-log.ts` |
| 추천 (랜딩) | `GET /api/v1/customer/recommendations?context=landing&policy=deadline_popularity` | `AiRecommendationSlider` |
| 유사 공구 | `GET /api/v1/products/similar?medusa_product_id=` | 상품/공구 상세 하단 |
| 장바구니·결제 이벤트 | `POST /api/v1/events` | `trackAddToCart`, `trackGroupBuyPaymentComplete` |
| 색인 피드 | — | `GET /store/products/search-index` (Medusa → Flask) |

### BFF (Next.js API Routes)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/api/ai/search?q=` | Flask 검색 프록시 |
| GET | `/api/ai/recommendations?context=&country_code=` | Flask 추천 + Medusa 상품 하이드레이션 |
| POST | `/api/ai/events` | 행동 로그 → Flask (항상 202, 실패 무시) |

상세 계약: [docs/api-contract-for-merge.md](./docs/api-contract-for-merge.md)

---

## 상품 · 공구 상세 연동

```
상품 클릭 (/products/{handle})
    │
    ├─ 연결된 Group Deal 있음 ──→ redirect /group-buying/{dealId}
    │
    └─ 공구 없음 ──→ DETL 미리보기 (참여 비활성)
                      + AI 유사 공구 추천 슬라이더
```

**Admin에서 실제 참여가 가능하게 하려면:**

1. **Products** — Published, Sales Channel, KRW 가격
2. **Group Deals** — 해당 상품 연결, **상태 Open**
3. (권장) **총대 보증금** `deposited` — 목록·카드 노출

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
| AI (선택) | Flask | 검색·추천·로그 전용 |
| Node.js | >= 20 | |

---

## 프로젝트 구조

```
group-buying-site/
├── README.md
├── PROJECT_STATUS.md          # 아키텍처·API·To-Do 상세
├── CODE_ANALYSIS.md           # 코드 레이어·패턴 분석
├── DEPLOYMENT.md
├── docs/
│   ├── domain-contract-for-merge.md
│   └── api-contract-for-merge.md
├── apps/
│   ├── backend/                         # @dtc/backend
│   │   └── src/
│   │       ├── modules/group-buying/
│   │       ├── api/store/group-deals/
│   │       ├── api/store/me/            # bank-account, trust-profile, price-rec, review, dispute
│   │       ├── api/store/products/search-index/
│   │       ├── api/admin/group-deals/   # receipt (AI stub)
│   │       ├── utils/                   # leader-trust-profile, group-deal-price-recommendations
│   │       ├── jobs/group-deal-maintenance.ts
│   │       └── admin/routes/group-deals/
│   └── storefront/                      # @dtc/storefront
│       └── src/
│           ├── app/[countryCode]/
│           │   ├── (landing)/           # 랜딩 + AI 추천 + 역할별 redirect
│           │   └── (main)/
│           │       ├── store/           # Flask 검색 결과
│           │       ├── group-buying/[id]/deposit/
│           │       ├── products/[handle]/
│           │       ├── order/[id]/confirmed/
│           │       └── account/         # trust-reviews, bank-account, hosted dashboard
│           ├── app/api/ai/              # search, recommendations, events
│           ├── modules/
│           │   ├── landing/
│           │   ├── group-buying/        # timeline, deposit, join, receipt
│           │   ├── products/            # product-preview, ai-recommendation-slider
│           │   ├── account/             # trust-profile-panel, ai-price-recommendation-panel
│           │   ├── store/               # paginated-products, flask-search-meta
│           │   └── order/               # order-completed + behavior logger
│           └── lib/
│               ├── data/flask-search.ts
│               ├── data/flask-behavior-log.ts
│               ├── util/flask-behavior-log.ts
│               ├── util/landing-deals.ts
│               └── config/flask-search.ts
```

---

## 빠른 시작

### 필요 환경

- **Node.js** v20 이상
- **pnpm** v10 이상
- **PostgreSQL** — 로컬 또는 [Supabase](https://supabase.com)
- **(선택) Flask** — 검색·추천·로그 API (`SEARCH_API_ENABLED=true`로 활성화)

#### Windows 참고

- PowerShell에서 `pnpm`이 안 되면: `npm install -g pnpm` 후 **터미널 재시작**
- `pnpm dev`는 PowerShell에서 앱별로 실행: `pnpm backend:dev`, `pnpm storefront:dev`
- `npx` 실행 정책 오류 시: `npx.cmd medusa ...` 또는 CMD 사용

### 1. 의존성 설치

```bash
git clone https://github.com/yjj0066/group_buying.git
cd group-buying-site
pnpm install
```

### 2. 환경 변수

```bash
cp apps/backend/.env.template apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local
```

**Backend** (`apps/backend/.env`) — 최소:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/group_buying
STORE_CORS=http://localhost:8000
ADMIN_CORS=http://localhost:5173,http://localhost:9000
AUTH_CORS=http://localhost:5173,http://localhost:9000
JWT_SECRET=dev-jwt-secret-change-in-production
COOKIE_SECRET=dev-cookie-secret-change-in-production
# Supabase 사용 시:
# DATABASE_SSL=true
```

**Storefront** (`apps/storefront/.env.local`):

```env
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_DEFAULT_REGION=kr
NEXT_PUBLIC_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SITE_NAME=공동구매몰

# Flask — 로컬 dev 기본 OFF (Flask 기동 후 true로 변경)
SEARCH_API_ENABLED=false
NEXT_PUBLIC_SEARCH_API_URL=http://localhost:5000
# FLASK_REQUEST_TIMEOUT_MS=800
```

### 3. DB · 시드 · Admin 계정

```bash
cd apps/backend

pnpm db:migrate
pnpm medusa user -e admin@test.com -p supersecret
pnpm seed:locales
pnpm seed:regions
pnpm seed:korea-toss
pnpm seed:stripe
```

### 4. 개발 서버

```bash
# 루트에서 (백엔드 + 스토어프론트 동시)
pnpm dev

# 또는 개별 실행
pnpm backend:dev      # Medusa :9000
pnpm storefront:dev   # Next.js :8000 (Turbopack)
```

| 확인 URL | 설명 |
|----------|------|
| http://localhost:9000/app/login | Admin (`admin@test.com` / `supersecret`) |
| http://localhost:8000/kr | 랜딩 + AI 추천 |
| http://localhost:8000/kr/store?q=bts | Flask 검색 (활성화 시) |
| http://localhost:8000/kr/group-buying | 공구 목록·필터 |
| http://localhost:8000/kr/account/trust-reviews | 총대 신뢰·후기 (로그인 필요) |

### 5. Publishable API Key (필수)

1. Admin → **Settings → Publishable API Keys** → **Create**
2. **`pk_` 토큰** 복사
3. **Settings → Sales Channels** → Default Sales Channel에 연결
4. `.env.local`에 설정 후 **스토어프론트 재시작**

```bash
curl -H "x-publishable-api-key: pk_여기키" http://localhost:9000/store/regions
```

---

## 공동구매 참여 흐름

### v3 가상계좌 경로 (KR, 현재 기본)

```
1. GET  /store/group-deals/:id           공구 상세
2. (UI) 멤버 자리 선택 + 5분 클라이언트 홀드
3. POST /store/group-deals/:id/join      participant + virtual_account
4. /group-buying/:id/deposit             가상계좌 입금 안내 (5분 deadline)
5. (stub) POST .../deposit-confirm       입금 확인 → participant confirmed
```

### PG 에스크로 경로 (Toss / Stripe)

```
1. POST /store/group-deals/:id/join    → cart
2. /checkout                             배송지 · 빌링키/SetupIntent
3. /order/:id/confirmed                  주문 완료 (+ 행동 로그)
4. minimum_reached → 일괄 캡처
5. POST .../participations/:id/confirm-delivery
6. (cron) D+7 경과 시 autoConfirmOverdueDeliveries
```

---

## 스토어프론트 페이지

| URL | 스펙 | 설명 |
|-----|------|------|
| `/kr` | HOME | 랜딩, 최애 기반 AI 추천, 로그인 시 역할별 redirect |
| `/kr/store?q=` | SRCH | Flask semantic 검색 결과 |
| `/kr/group-buying` | SRCH | 공구 목록·필터·긴급 모집 |
| `/kr/group-buying/[id]` | DETL | 신뢰도·타임라인·자리·유사 추천 |
| `/kr/group-buying/[id]/deposit` | CHKO | 가상계좌 입금 |
| `/kr/products/[handle]` | DETL* | 공구 redirect 또는 미리보기 |
| `/kr/order/[id]/confirmed` | DONE | 주문 완료 (+ 공구 결제 로그) |
| `/kr/account/bank-account` | ACCT | 환불 계좌 |
| `/kr/account/trust-reviews` | MTRS | 총대 신뢰 프로필·후기·신고 |
| `/kr/account/group-deals/hosted/[id]` | DASH | 총대 대시보드 + AI 단가 추천 |
| `/kr/account/group-deals/participations/[id]` | MYJD | 참여 상세·후기·분쟁 |
| `/kr/account/settlements` | MSTL | 정산 내역 |
| `/kr/account/forgot-password` | LGN | 비밀번호 찾기 스텁 |
| `/kr/account/customer-service` | MCS | 고객센터 스텁 |

---

## API 요약

### Store (공개)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/store/group-deals` | 공구 목록 |
| GET | `/store/group-deals/:id` | 공구 상세 + options + leader stats |
| GET | `/store/group-deals/by-product/:productId` | 상품별 연결 공구 |
| POST | `/store/group-deals/:id/join` | 참여 → VA + `checkout_path` |
| POST | `/store/group-deals/:id/deposit-confirm` | VA 입금 확인 (stub) |
| POST | `/store/group-deals/:id/waitlist` | 대기열 등록 |
| GET | `/store/products/search-index` | Flask 색인 피드 |

### Store (인증 — `/store/me`)

| Method | 경로 | 설명 |
|--------|------|------|
| GET/POST | `/store/me/bank-account` | 환불 계좌 |
| GET/PUT | `/store/me/preferences` | 알림·최애·`preferred_role` |
| GET | `/store/me/trust-profile` | 총대 신뢰 프로필 (MTRS) |
| POST | `/store/me/trust-profile/reviews/:reviewId/report` | 후기 신고 |
| GET | `/store/me/group-deals/:id/price-recommendations` | AI 단가 추천 (DASH) |
| POST | `/store/me/group-deals/:id/apply-price-recommendations` | 추천가 일괄 적용 |
| POST | `/store/me/group-deals/:id/urgent-fill` | 긴급 모집 |
| POST | `/store/me/group-deals/:id/deposit` | 총대 보증금 입금 |
| GET | `/store/me/group-deals/hosted` | 총대 공구 목록 |
| GET | `/store/me/group-deals/participations` | 참여 목록 |
| POST | `/store/me/group-deals/participations/:id/review` | 후기 |
| POST | `/store/me/group-deals/participations/:id/dispute` | 분쟁 |
| POST | `/store/me/group-deals/participations/:id/confirm-delivery` | 수령 확인 |
| GET | `/store/me/group-deals/settlements` | 정산 내역 |
| GET/POST/DELETE | `/store/me/payment-methods` | 결제수단 CRUD |

---

## 행동 로그 (Analytics)

클라이언트 유틸: `lib/util/flask-behavior-log.ts`

| 이벤트 | 트리거 | Flask |
|--------|--------|-------|
| `search_click` | `/store` 검색 결과 카드 클릭 | `POST /api/v1/products/search/click` |
| `add_to_cart` | 상품 상세 "공동구매 참여" → 장바구니 | `POST /api/v1/events` |
| `group_buy_payment_complete` | 주문 완료 또는 VA deposit 페이지 | `POST /api/v1/events` |

모든 로그는 **fire-and-forget** — 전송 실패 시 장바구니·결제 UX에 영향 없음.

---

## v3 스펙 대비 현황

### 구현됨

- SRCH/DETL/MYJN/MTRS/DASH 핵심 UI, Flask 검색·추천·로그
- CHKO 가상계좌 deposit, 5분 payment_deadline
- ACCT 환불 계좌, 역할 전환, 후기/분쟁 API
- HOME-01 역할별 redirect, HOME-03 최애 기반 랜딩 추천
- DASH-05 AI 단가 추천, MTRS-01 신뢰·후기 페이지
- DETL 개봉 타임라인, 구조화 영수증, 총대 신뢰도(첫 공구 분기)
- Admin 영수증 SDK 인증, GroupDealStatus `OPEN` 정합성
- Cron D+7 자동 수령 확인, 정산 API

### 미구현 · 부분 구현

| 스펙 | 내용 |
|------|------|
| CHKO-02 | 실제 은행 webhook 입금 자동 확인 |
| CHKO-03 (서버) | 서버 사이드 5분 seat lock API |
| DASH-05 | 가격 인하 시 참여자 환불 자동화 |
| OPEN/VERI/RPT | 개봉·검수·정산 전용 운영 UI 일부 |
| SGN/LGN-02 | 소셜 로그인, 실명 인증 |
| STLM | Flask 정산 이식 |

상세: **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** · **[CODE_ANALYSIS.md](./CODE_ANALYSIS.md)**

---

## 환경 변수

### 스토어프론트

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | `pk_` 키 |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | Medusa URL |
| `NEXT_PUBLIC_SEARCH_API_URL` | Flask URL (검색·추천·로그) |
| `SEARCH_API_ENABLED` | `false`(기본, dev) / `true` — Flask 활성화 |
| `AI_ENGINE_URL` | Flask URL 별칭 |
| `FLASK_REQUEST_TIMEOUT_MS` | Flask 요청 타임아웃 (dev 기본 800) |

템플릿: `apps/storefront/.env.template`

---

## 스크립트

| 명령 | 설명 |
|------|------|
| `pnpm dev` | 백엔드 + 스토어프론트 |
| `pnpm backend:dev` | Medusa :9000 |
| `pnpm storefront:dev` | Next.js :8000 (Turbopack) |
| `pnpm build` | 전체 빌드 |
| `pnpm --filter @dtc/backend test:unit` | 백엔드 단위 테스트 |

---

## 트러블슈팅

| 증상 | 해결 |
|------|------|
| **Error -102** (`localhost:9000/app/login`) | 백엔드 미기동 — `apps/backend`에서 `pnpm dev` 실행 |
| 백엔드 시작 즉시 crash (`Cannot find module .../modules/group-buying`) | API route의 상대 import depth 오류 — `participations/[id]/*`는 7단계(`../../../../../../../`), `[id]/*`는 6단계 |
| Admin 영수증 Verify 401 | `@medusajs/js-sdk` 기반 admin-fetch 사용 확인, 재로그인 |
| Admin 로그인 후 401 | `JWT_SECRET`·`COOKIE_SECRET` 고정, 쿠키 삭제 |
| 페이지 로딩이 매우 느림 (dev) | Flask 기본 OFF 확인 (`SEARCH_API_ENABLED=false`), 백엔드 `:9000` 기동 여부 확인 |
| Flask 검색 결과 없음 | Flask `:5000` 기동 후 `SEARCH_API_ENABLED=true`, `NEXT_PUBLIC_SEARCH_API_URL` 확인 |
| AI 추천 슬라이더 안 보임 | Flask recommendations API 미응답 — 정상(숨김 처리) |
| 랜딩 Mock만 보임 | Admin Open + deposited 공구 등록 |
| Publishable key 오류 | Admin `pk_` 재발급 · Sales Channel 연결 |

---

## 문서

| 문서 | 설명 |
|------|------|
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | 아키텍처·API·To-Do 상세 |
| [CODE_ANALYSIS.md](./CODE_ANALYSIS.md) | 코드 레이어·패턴·확장 가이드 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel + Supabase 배포 |
| [docs/domain-contract-for-merge.md](./docs/domain-contract-for-merge.md) | 도메인 계약 |
| [docs/api-contract-for-merge.md](./docs/api-contract-for-merge.md) | Flask API 계약 |

---

## GitHub 업로드 시

**제외:** `.env`, `.env.local`, `node_modules/`, `.next/`, `.medusa/`, `dist/`

**포함:** 소스, `.env.template`, `pnpm-lock.yaml`, `README.md`, `docs/`

---

## 라이선스

MIT (Medusa 스타터 기반)
