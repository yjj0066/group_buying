# Group Buying Site (BiasBuy / 아이돌 공구몰)

Medusa v2 + Next.js 15 기반 **K-POP 굿즈 공동구매(Group Deal)** 플랫폼입니다.  
총대(리더) 보증금, 참여자 가상계좌 입금, 멤버별 자리 선택, 대기자(waitlist) 매칭, 수령 확인 후 정산까지 공동구매 특화 도메인을 Medusa 커스텀 모듈로 구현했습니다.

**GitHub:** https://github.com/yjj0066/group_buying

> **기준 문서:** `아이돌공구-기능정의서 (2).xlsx` (v3)  
> 추출본: `_spec_extract_v3.txt`

| 서비스 | URL |
|--------|-----|
| 랜딩 홈 | http://localhost:8000/kr |
| **공동구매 목록 (SRCH)** | http://localhost:8000/kr/group-buying |
| 전체 상품 (레거시) | http://localhost:8000/kr/store |
| **공구 앱 홈 (GB App)** | http://localhost:8000/kr/home *(로그인 필요)* |
| **공구 앱 검색** | http://localhost:8000/kr/search |
| **공구 상세 (DETL)** | http://localhost:8000/kr/deals/{dealId} |
| **가상계좌 입금 (CHKO)** | http://localhost:8000/kr/deals/{dealId}/deposit |
| **총대 대시보드** | http://localhost:8000/kr/seller/deals/{dealId} |
| **공구 앱 마이** | http://localhost:8000/kr/my |
| 마이페이지 (레거시) | http://localhost:8000/kr/account |
| Admin | http://localhost:9000/app |
| Medusa API | http://localhost:9000 |
| Flask AI (선택) | http://localhost:5000 |

> `http://localhost:9000/` 에서 `Cannot GET /` 가 보이면 **정상**입니다. Admin은 `/app` 으로 접속합니다.

---

## 최근 반영 사항 (2026-07-20)

### UX · 네비게이션

| 변경 | 내용 | 주요 파일 |
|------|------|-----------|
| **상단 검색 → 공동구매** | 헤더 돋보기 검색이 `/store?q=` 대신 **`/group-buying?q=`** 로 이동 (상단 **공동구매** 버튼과 동일) | `product-search/`, `group-deal-filter-url.ts` (`buildGroupBuyingSearchPath`) |
| **통화 선택 제거** | KRW 전용 정책 — 상단 EUR/USD/KRW 선택 UI 제거 | `nav/index.tsx`, `currency-select/` 삭제 |
| **로그인 버튼 가시성** | 흰 배경에서 안 보이던 로그인 버튼 → `variant="primary"` (보라색 CTA) | `account/components/login/` |

### 공동구매 검색·필터 (SRCH)

| 기능 | 설명 | 주요 파일 |
|------|------|-----------|
| **아이돌 그룹 필터** | 검색 가능 드롭다운, 부분 일치 | `search-filter-bar/`, `group-deal-filters.ts` |
| **굿즈 종류** | 앨범, 포토카드, 응원봉, MD 세트 (총대 개설과 동일) | `group-buying-filter-match.ts` |
| **가격 범위** | 듀얼 슬라이더 + 직접 입력 | `price-range-filter/` |
| **URL 쿼리 동기화** | `q`, `group`, `goods`, `minPrice`, `maxPrice` 등 | `group-deal-filter-url.ts`, `use-group-deal-search.ts` |

### 참여·입금 API 연동

| 변경 | 내용 |
|------|------|
| **`POST /store/group-deals/:id/apply`** | 인증 필수 참여 신청 API 추가 — `prepareGroupDealCheckoutWorkflow`, VA 발급, 배송지·멤버 메타데이터 저장 |
| **입금 확인** | `deposit-confirm` 에서 고객 소유 participant 검증 |
| **내 참여 목록** | `listMyParticipations` 가 빈 배열도 정상 반환하도록 수정 |
| **프론트 서버 액션** | `group-deal-participation.ts` — `submitDealApplication`, `confirmVirtualAccountDeposit` 등 |

### 총대 공구 개설 버그 수정

| 증상 | 조치 |
|------|------|
| 날짜 형식 오류 (`expected_ship_date`) | ISO datetime 정규화 (`normalizeDraftDateToIsoDateTime`) |
| `member_seats`, `idol_group`, `goods_type` 거부 | 백엔드 validator·route 매핑 추가 |
| 데모 상품 없음 | `pnpm seed:group-buy-demo-product` 스크립트 추가 |
| 모호한 검증 오류 | `format-group-deal-validation-error.ts` 개선 |

---

## 최근 반영 사항 (2026-07-18)

### 공구 앱 (GB App) UI — 와이어프레임 기반

Medusa 스토어프론트에 **모바일 우선 공구 앱** `(gb-app)` 라우트 그룹을 추가했습니다.

| 구분 | 주요 경로 | 설명 |
|------|-----------|------|
| **참여자 홈** | `/kr/home` | 아이돌 칩, 검색, 탭, 공구 카드 |
| **공구 상세 (DETL)** | `/kr/deals/[dealId]` | 옵션 선택, 수량, 신청 CTA |
| **참여 신청 (APLY)** | `/kr/deals/[dealId]/apply` | 배송지, 환불 계좌 |
| **입금 (CHKO)** | `/kr/deals/[dealId]/deposit` | 5분 타이머, 가상계좌 복사 |
| **내 참여 (MYJN)** | `/kr/participations`, `/kr/my/participations` | 5단계 스테퍼 |
| **총대 개설** | `/kr/seller/create/*` | 기본정보 → 상품 → 판매 → 배송 → 보증금 |
| **총대 운영** | `/kr/seller/deals/[dealId]/*` | 모집, 확정, 발송, 정산 |

**라우트 정의:** `apps/storefront/src/lib/wireframe/routes.ts`

### 프론트엔드 성능 (INP)

- 검색 debounce 200ms (`use-debounced-value.ts`)
- `GroupDealCard` / `BbGroupBuyCard` memo + `CatalogResults` 분리
- 참여자/총대 모드 전환 optimistic UI

---

## 주요 기능

### 공동구매 도메인

| 기능 | 설명 |
|------|------|
| **가상계좌 입금 (v3)** | join/apply 시 VA 발급 → `/deposit` — 5분 `payment_deadline` |
| **총대 보증금** | `deposit_status=deposited` — 목록 노출·신뢰 배지 |
| **총대 신뢰·후기 (MTRS)** | 완료 공구·평점·분쟁 통계 |
| **AI 단가 추천 (DASH)** | 공석률·충원율 기반 권장가 |
| **멤버/버전 옵션** | `GroupDealOption` — DETL 자리 선택 UI |
| **에스크로·공석 처리** | 미결제 만료·취소 시 슬롯 해제, waitlist 매칭 |
| **Cron** | `group-deal-maintenance.ts` — 미결제 만료, D+7 자동 수령 확인 |

### 스토어프론트

| 기능 | 설명 |
|------|------|
| **공구 앱 (GB App)** | `(gb-app)` — 참여자/총대 모드, DETL→APLY→CHKO→DONE |
| **공동구매 검색 (SRCH)** | `/group-buying` — 필터·정렬·URL 동기화 |
| **상단 검색** | 헤더 돋보기 → `/group-buying?q=` (공동구매와 동일) |
| **KRW 전용** | 통화 선택 UI 없음, 모든 가격 원화(₩) 표시 |
| **프리미엄 랜딩** | 인기·마감임박 + 최애 아이돌 AI 추천 |
| **6개국어 UI** | ko / en / es / ru / zh / ja (언어 전환만 지원) |
| **Flask 검색 (선택)** | `/store?q=` — 상품 카탈로그 semantic search (Flask 활성화 시) |

### 운영·백오피스

| 기능 | 설명 |
|------|------|
| **Admin UI** | `src/admin/routes/group-deals/` — CRUD, 영수증 검증 |
| **알림 (개발)** | `notification_log` metadata 기록 |

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
├── PROJECT_STATUS.md
├── CODE_ANALYSIS.md
├── DEPLOYMENT.md
├── docs/
│   ├── domain-contract-for-merge.md
│   └── api-contract-for-merge.md
├── apps/
│   ├── backend/                         # @dtc/backend
│   │   └── src/
│   │       ├── modules/group-buying/
│   │       ├── api/store/group-deals/   # join, apply, deposit-confirm
│   │       ├── api/store/me/            # bank-account, trust-profile, hosted
│   │       ├── workflows/group-deals/
│   │       ├── jobs/group-deal-maintenance.ts
│   │       └── admin/routes/group-deals/
│   └── storefront/                      # @dtc/storefront
│       └── src/
│           ├── app/[countryCode]/
│           │   ├── (landing)/
│           │   ├── (gb-app)/            # 공구 앱 (홈·딜·총대·마이)
│           │   └── (main)/
│           │       ├── group-buying/    # 공구 목록·필터 (메인 SRCH)
│           │       ├── store/           # 레거시 상품 카탈로그
│           │       └── account/
│           ├── modules/
│           │   ├── group-buying/        # search-filter-bar, deposit, catalog
│           │   ├── layout/              # nav, product-search, side-menu
│           │   ├── landing/
│           │   └── account/
│           └── lib/
│               ├── util/group-deal-filter-url.ts
│               ├── data/group-deal-participation.ts
│               └── wireframe/routes.ts
```

---

## 빠른 시작

### 필요 환경

- **Node.js** v20 이상
- **pnpm** v10 이상
- **PostgreSQL** — 로컬 또는 [Supabase](https://supabase.com)
- **(선택) Flask** — 검색·추천·로그 API

#### Windows 참고

- PowerShell에서 `pnpm`이 안 되면: `npm install -g pnpm` 후 **터미널 재시작**
- `pnpm dev`는 앱별로 실행 가능: `pnpm backend:dev`, `pnpm storefront:dev`

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
```

**Storefront** (`apps/storefront/.env.local`):

```env
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_DEFAULT_REGION=kr
NEXT_PUBLIC_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SITE_NAME=BiasBuy

# Flask — 로컬 dev 기본 OFF
SEARCH_API_ENABLED=false
NEXT_PUBLIC_SEARCH_API_URL=http://localhost:5000
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
pnpm seed:group-buy-demo-product   # 총대 공구 개설용 데모 상품
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
| http://localhost:9000/app/login | Admin |
| http://localhost:8000/kr | 랜딩 |
| http://localhost:8000/kr/group-buying | **공동구매 목록·필터 (메인 쇼핑)** |
| http://localhost:8000/kr/group-buying?q=blackpink | 상단 검색 결과 |
| http://localhost:8000/kr/home | 공구 앱 홈 (로그인 필요) |
| http://localhost:8000/kr/deals/{dealId} | 공구 앱 상세 |

### 5. Publishable API Key (필수)

1. Admin → **Settings → Publishable API Keys** → **Create**
2. **`pk_` 토큰** 복사 → Sales Channel 연결
3. `.env.local`에 설정 후 **스토어프론트 재시작**

---

## 공동구매 참여 흐름

### v3 가상계좌 경로 (KR, 현재 기본)

```
1. GET  /store/group-deals/:id              공구 상세
2. (UI) 멤버 자리 선택 + 5분 클라이언트 홀드
3. POST /store/group-deals/:id/apply        참여 신청 (인증) → participant + VA
   또는 POST /store/group-deals/:id/join    join API (레거시)
4. /deals/:id/deposit                       가상계좌 입금 안내 (5분 deadline)
5. POST .../deposit-confirm                 입금 확인 → participant confirmed
6. GET  /store/me/group-deals/participations  내 참여 관리
```

---

## 스토어프론트 페이지

### 공구 앱 `(gb-app)`

| URL | 스펙 | 설명 |
|-----|------|------|
| `/kr/home` | HOME/SRCH | 참여자·총대 모드 홈 |
| `/kr/search` | SRCH | GB App 검색 |
| `/kr/deals/[dealId]` | DETL | 공구 상세 |
| `/kr/deals/[dealId]/apply` | APLY | 참여 신청 |
| `/kr/deals/[dealId]/deposit` | CHKO | 가상계좌 입금 |
| `/kr/seller/create/*` | — | 총대 공구 개설 위저드 |
| `/kr/seller/deals/[dealId]/*` | DASH | 총대 운영 |
| `/kr/my/*` | MYP* | 마이페이지 허브 |

### 메인 쇼핑 `(main)`

| URL | 설명 |
|-----|------|
| `/kr/group-buying` | **공구 목록·필터 (SRCH)** — 상단 검색·공동구매 버튼 진입점 |
| `/kr/group-buying?q=&group=&goods=` | URL 필터 동기화 |
| `/kr/group-buying/[id]` | 레거시 공구 상세 |
| `/kr/store?q=` | 레거시 상품 카탈로그 (Flask 검색, 선택) |
| `/kr/account/*` | 마이페이지, 총대 대시보드, 신뢰·후기 |

---

## API 요약

### Store (공개)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/store/group-deals` | 공구 목록 |
| GET | `/store/group-deals/:id` | 공구 상세 + options |
| POST | `/store/group-deals/:id/join` | 참여 → VA + checkout |
| POST | `/store/group-deals/:id/apply` | **참여 신청 (인증)** → VA + participant |
| POST | `/store/group-deals/:id/deposit-confirm` | VA 입금 확인 |
| POST | `/store/group-deals/:id/waitlist` | 대기열 등록 |

### Store (인증 — `/store/me`)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/store/me/group-deals/participations` | 내 참여 목록 |
| GET | `/store/me/group-deals/hosted` | 총대 공구 목록 |
| POST | `/store/me/group-deals/:id/deposit` | 총대 보증금 입금 |
| GET/POST | `/store/me/bank-account` | 환불 계좌 |
| GET | `/store/me/trust-profile` | 총대 신뢰 프로필 |
| POST | `/store/me/group-deals/participations/:id/confirm-delivery` | 수령 확인 |

상세: **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** · **[docs/api-contract-for-merge.md](./docs/api-contract-for-merge.md)**

---

## Flask 하이브리드 AI (선택)

Medusa는 **결제·주문·재고**를, Flask는 **상품 검색·추천·로그**만 담당합니다.  
로컬 dev에서는 Flask **기본 비활성** (`SEARCH_API_ENABLED=false`).

| 용도 | Flask API | Storefront |
|------|-----------|------------|
| 상품 검색 | `GET /api/v1/products/search?q=` | `/store?q=` (레거시 카탈로그) |
| 추천 | `GET /api/v1/customer/recommendations` | 랜딩 AI 슬라이더 |
| BFF | `/api/ai/search`, `/api/ai/recommendations` | Next.js API Routes |

> **공동구매 검색**은 Flask가 아닌 Medusa 공구 카탈로그 + 클라이언트 필터(`/group-buying`)를 사용합니다.

---

## 스크립트

| 명령 | 설명 |
|------|------|
| `pnpm dev` | 백엔드 + 스토어프론트 |
| `pnpm backend:dev` | Medusa :9000 |
| `pnpm storefront:dev` | Next.js :8000 |
| `pnpm build` | 전체 빌드 |
| `pnpm --filter @dtc/backend seed:group-buy-demo-product` | 데모 상품 시드 |
| `pnpm --filter @dtc/backend test:unit` | 백엔드 단위 테스트 |

---

## 알려진 갭 · 미구현

| 항목 | 상태 |
|------|------|
| CHKO-02 | 실제 은행 webhook 입금 자동 확인 (stub) |
| CHKO-03 (서버) | 서버 사이드 5분 seat lock API |
| Upstage OCR | 구매증빙/송장 AI — stub |
| 소셜 로그인 | 미구현 |

---

## 트러블슈팅

| 증상 | 해결 |
|------|------|
| **상단 검색이 상품 페이지로 이동** | 최신 코드 반영 확인 — `/group-buying?q=` 로 이동해야 함 |
| **내 참여 관리가 비어 있음** | 로그인 상태 확인, `apply` API·백엔드 재시작 |
| **공구 개설 검증 오류** | `pnpm seed:group-buy-demo-product` 실행, 날짜·멤버·굿즈 필드 확인 |
| **Error -102** (Admin) | 백엔드 미기동 — `pnpm backend:dev` |
| **`/kr/home` → 로그인** | 정상 — 비로그인 시 리다이렉트. 메인 쇼핑은 `/kr/group-buying` |
| **`'id' !== 'participantId'`** | stale `[id]/` 폴더 삭제 후 dev 재시작 |
| Publishable key 오류 | Admin `pk_` 재발급 · Sales Channel 연결 |
| Flask 검색 없음 | Flask `:5000` + `SEARCH_API_ENABLED=true` (상품 `/store` 전용) |

---

## 문서

| 문서 | 설명 |
|------|------|
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | 아키텍처·API·To-Do 상세 |
| [CODE_ANALYSIS.md](./CODE_ANALYSIS.md) | 코드 레이어·패턴 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel + Supabase 배포 |
| [docs/domain-contract-for-merge.md](./docs/domain-contract-for-merge.md) | 도메인 계약 |

---

## GitHub 업로드 시

**제외:** `.env`, `.env.local`, `node_modules/`, `.next/`, `.medusa/`, `dist/`

**포함:** 소스, `.env.template`, `pnpm-lock.yaml`, `README.md`, `docs/`

---

## 라이선스

MIT (Medusa 스타터 기반)
