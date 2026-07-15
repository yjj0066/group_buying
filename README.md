# Group Buying Site (아이돌 공구몰)

Medusa v2 + Next.js 15 기반 **K-POP 굿즈 공동구매(Group Deal)** 플랫폼입니다.  
총대(리더) 보증금, 참여자 예약 결제(PG 에스크로), 멤버별 자리 선택, 대기자(waitlist) 매칭, 수령 확인 후 정산까지 공동구매 특화 도메인을 Medusa 커스텀 모듈로 구현했습니다.

> **기준 문서:** `아이돌공구-기능정의서 (1).xlsx`, `아이돌공구-화면별데이터목록.xlsx`, `아이돌공구-화면정의서 (2).xlsx` (v2)  
> 추출본: `_spec_extract_v2.txt`

| 서비스 | URL |
|--------|-----|
| 랜딩 홈 | http://localhost:8000/kr |
| 전체 상품 | http://localhost:8000/kr/store |
| 공동구매 목록 (SRCH) | http://localhost:8000/kr/group-buying |
| 공구 상세 (DETL) | http://localhost:8000/kr/group-buying/{id} |
| 마이페이지 | http://localhost:8000/kr/account |
| Admin | http://localhost:9000/app |
| Medusa API | http://localhost:9000 |

> `http://localhost:9000/` 에서 `Cannot GET /` 가 보이면 **정상**입니다. Admin은 `/app` 으로 접속합니다.

---

## 최근 반영 사항 (2026-07)

### 스토어프론트 · 화면 스펙 (P0)

| 화면 ID | 반영 내용 |
|---------|-----------|
| **SRCH** | `/group-buying` 목록 페이지, 통합 검색(2자 이상), 그룹·멤버·굿즈·가격 필터, **마감임박/최신 정렬**, 최애 빈자리만 보기, 카드(멤버칩·신뢰도·보증금·진행률) |
| **DETL** | 총대 신뢰도·보증금 금액, 6단계 타임라인, 참여 진행률·가격·할인, **멤버 자리 선택**, **5분 클라이언트 홀드**, 1차 구매 영수증 증빙 보기, PG 에스크로 안내 |
| **MYJN / MYJD** | 참여 목록(진행중/완료/취소), **참여 상세** 페이지, 수령 확인 버튼, 진행 타임라인 |
| **상품 연동** | 등록 상품 클릭 시 데모와 **동일한 공구 상세 UI** — 연결된 공구가 있으면 `/group-buying/{id}`로 이동, 없으면 상품 정보로 미리보기 화면 표시 |

### 백엔드 · Admin

| 항목 | 내용 |
|------|------|
| **상품↔공구 조회** | `GET /store/group-deals/by-product/:productId` |
| **목록 navigation 모드** | `GET /store/group-deals?navigation=true` — 보증금 미입금 공구도 상품 링크용 인덱스에 포함 |
| **공구 생성 기본값** | Admin 생성 시 상태 기본값 `open` (즉시 스토어 노출 가능) |
| **영수증 URL** | Store API 직렬화에 `purchase_receipt_url` 포함 |

### 하이브리드 AI (Flask 연동)

| 항목 | 내용 |
|------|------|
| **검색** | 검색어 있을 때 Flask AI 엔진 우선 → 실패 시 Medusa 상품 검색 fallback |
| **BFF** | `app/api/ai/search`, `app/api/ai/recommendations` |
| **인덱스 피드** | `GET /store/products/search-index` — Flask 쪽 색인용 |
| **랜딩** | AI 추천 레일, Mock 데이터일 때 `DemoDataBanner` |
| **계약 문서** | `docs/domain-contract-for-merge.md`, `docs/api-contract-for-merge.md` |

---

## 주요 기능

### 공동구매 도메인

| 기능 | 설명 |
|------|------|
| **공동구매 + 예약 결제** | KR: Toss 빌링키 / 해외: Stripe SetupIntent → `minimum_reached` 시 일괄 캡처 |
| **총대 보증금** | `deposit_status=deposited` — 목록 노출·신뢰 배지 (스펙 SRCH-05) |
| **에스크로·공석 처리** | 미결제 만료·취소 시 슬롯 해제, waitlist 자동 매칭 |
| **멤버/버전 옵션** | `GroupDealOption` — DETL 자리 선택 UI → join API `selections` 전달 |
| **2단계 결제 모델** | `payment_phase_mode: split_product_shipping` (1차 상품 + 2차 배송비, 골격) |
| **수요조사** | 상품 metadata 기반 (결제와 분리) |

### 스토어프론트

| 기능 | 설명 |
|------|------|
| **프리미엄 랜딩** | 인기·마감임박·카테고리, API 공구 없을 때 `MOCK_DEALS` 6건 |
| **공구 목록·상세** | `GroupDealsCatalog`, `LeaderTrustPanel`, `MemberSeatPicker`, `PurchaseReceiptPanel`, `DealJoinSection` |
| **상품 → 공구 UI** | `findGroupDealByProductId` / `buildGroupDealFromProduct` — 등록 상품도 DETL 형식 |
| **전체 상품** | `/store` — 공구 연결 시 카드가 `/group-buying/{id}` 로 이동 |
| **마이페이지** | 결제수단, 총대 공구, 참여·**참여 상세**, 정산, 알림 설정 |
| **6개국어 UI** | ko / en / es / ru / zh / ja |
| **하이brid AI** | Flask 검색·추천 (선택, `AI_ENGINE_URL`) |

### 운영·백오피스

| 기능 | 설명 |
|------|------|
| **Admin UI** | `src/admin/routes/group-deals/` — 공구 CRUD, 리더 관리 패널 |
| **Cron job** | `group-deal-maintenance.ts` — 미결제 만료 + `ends_at` 경과 deal `closed` |
| **알림 (개발)** | `notification_log` metadata 기록 (실제 이메일/SMS 미연동) |

---

## 상품 · 공구 상세 연동

등록한 Medusa 상품을 눌렀을 때 **데모 공구와 같은 화면**이 표시됩니다.

```
상품 클릭 (/products/{handle})
    │
    ├─ 연결된 Group Deal 있음 ──→ redirect /group-buying/{dealId}
    │
    └─ 공구 없음 ──→ 동일 DETL 템플릿 (상품 가격·이미지 기반 미리보기)
                      참여는 비활성 — Admin에서 공구 생성 필요
```

**Admin에서 실제 참여가 가능하게 하려면:**

1. **Products** — Published, Sales Channel, KRW 가격
2. **Group Deals** — 해당 상품 연결, **상태 Open**
3. (권장) **총대 보증금** `deposited` — 목록·카드 노출 조건

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
| AI (선택) | Flask | `AI_ENGINE_URL` — 검색·추천 전용 |
| Node.js | >= 20 | |

---

## 프로젝트 구조

```
group-buying-site/
├── package.json
├── PROJECT_STATUS.md               # 구현 현황 상세
├── DEPLOYMENT.md
├── docs/
│   ├── domain-contract-for-merge.md
│   └── api-contract-for-merge.md
├── _spec_extract_v2.txt            # Excel v2 스펙 추출본
├── apps/
│   ├── backend/                    # @dtc/backend
│   │   └── src/
│   │       ├── modules/group-buying/
│   │       ├── workflows/
│   │       ├── api/store/group-deals/
│   │       │   ├── route.ts                    # GET 목록 (?navigation=true)
│   │       │   ├── [id]/route.ts
│   │       │   └── by-product/[productId]/     # 상품별 공구 조회
│   │       ├── api/store/products/search-index/
│   │       └── admin/routes/group-deals/
│   └── storefront/                 # @dtc/storefront
│       └── src/
│           ├── app/[countryCode]/
│           │   ├── (landing)/                  # 랜딩
│           │   └── (main)/
│           │       ├── group-buying/           # SRCH 목록
│           │       ├── group-buying/[id]/      # DETL 상세
│           │       ├── products/[handle]/      # → 공구 UI / redirect
│           │       ├── store/                  # 전체 상품
│           │       └── account/.../participations/[participantId]/  # MYJD
│           ├── modules/group-buying/
│           │   ├── components/
│           │   │   ├── group-deals-catalog/
│           │   │   ├── member-seat-picker/
│           │   │   ├── purchase-receipt-panel/
│           │   │   └── deal-join-section/
│           │   └── templates/group-deal-detail/
│           ├── lib/
│           │   ├── data/group-deals.ts
│           │   ├── util/product-group-deal.ts    # 상품→공구 변환·보강
│           │   ├── util/group-deal-filters.ts
│           │   └── config/ai-engine.ts
│           └── app/api/ai/                       # BFF (search, recommendations)
```

---

## 빠른 시작

### 필요 환경

- **Node.js** v20 이상
- **pnpm** v10 이상
- **PostgreSQL** — 로컬 또는 [Supabase](https://supabase.com)

#### Windows 참고

- PowerShell에서 `pnpm`이 안 되면: `npm install -g pnpm` 후 **터미널 재시작**
- `npx` 실행 정책 오류 시: `npx.cmd medusa ...` 또는 CMD 사용

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
NEXT_PUBLIC_SITE_NAME=공동구매몰

# 선택: Flask AI 검색·추천
AI_ENGINE_URL=http://localhost:5000
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
# 루트에서
pnpm dev

# 또는
pnpm backend:dev      # :9000
pnpm storefront:dev   # :8000
```

| 확인 URL | 설명 |
|----------|------|
| http://localhost:9000/app/login | Admin 로그인 (`admin@test.com` / `supersecret`) |
| http://localhost:8000/kr | 랜딩 |
| http://localhost:8000/kr/group-buying | 공구 목록·필터 |
| http://localhost:8000/kr/store | 전체 상품 |

### 5. Publishable API Key (필수)

1. Admin → **Settings → Publishable API Keys** → **Create**
2. **`pk_` 토큰** 복사 (Supabase `sb_publishable_` 키 아님)
3. **Settings → Sales Channels** → Default Sales Channel에 연결
4. `.env.local`에 설정 후 **스토어프론트 재시작**

```bash
curl -H "x-publishable-api-key: pk_여기키" http://localhost:9000/store/regions
```

---

## Admin에서 공구 등록

| 체크 | 설명 |
|------|------|
| **상품 Published** | Sales Channel + KRW 가격 |
| **Group Deal 생성** | Admin → Group Deals → 상품 연결 (기본 **Open**) |
| **보증금 deposited** | SRCH 목록·랜딩 API 노출 (미입금은 상품 링크·상세만 가능) |
| **멤버 옵션** | Admin에서 member 옵션 추가 시 DETL 자리 선택 UI 활성화 |
| **Publishable Key** | Default Sales Channel 연결 |

> open 공구가 없으면 랜딩·목록에 `MOCK_DEALS`(BTS, IVE, NewJeans 등 6건)가 표시됩니다. Mock 공구 상세에는 데모용 멤버 자리 3칸이 포함됩니다.

---

## 공동구매 결제 흐름

### 리전별 결제

| 리전 | Provider | 방식 |
|------|----------|------|
| `kr` | Toss | 빌링키 예약 |
| 그 외 | Stripe | SetupIntent (off_session) |

### End-to-end (현재 구현)

```
1. GET  /store/group-deals/:id              공구 상세 (+ options)
2. (UI) 멤버 자리 선택 + 5분 클라이언트 홀드
3. POST /store/group-deals/:id/join         cart + participant (selections optional)
4. /checkout                              배송지 · 결제
5. order.placed → participant reserved
6. minimum_reached → 일괄 캡처
7. POST .../participations/:id/confirm-delivery  수령 확인 → 정산
```

> 스펙 v2의 **APLY → CHKO → DONE** 분리 화면·서버 홀드 API(`POST /hold`)는 아직 미구현입니다. 현재는 DETL에서 바로 join → checkout으로 이어집니다.

---

## 스토어프론트 페이지

| URL | 스펙 | 설명 |
|-----|------|------|
| `/kr` | HOME | 랜딩 (API 공구 또는 MOCK) |
| `/kr/store` | — | 전체 상품, 공구 연결 시 group-buying 링크 |
| `/kr/group-buying` | SRCH | 공구 목록·필터·정렬 |
| `/kr/group-buying/[id]` | DETL | 신뢰도·타임라인·자리·참여 |
| `/kr/products/[handle]` | DETL* | 공구 연결 시 redirect, 없으면 DETL 미리보기 |
| `/kr/cart`, `/kr/checkout` | CHKO | 장바구니·결제 |
| `/kr/account/group-deals/participations` | MYJN | 참여 목록 (탭) |
| `/kr/account/group-deals/participations/[id]` | MYJD | 참여 상세·수령 확인 |
| `/kr/account/payment-methods` | MPAY | 결제수단 |
| `/kr/account/group-deals/hosted` | MGBY | 총대 공구 |
| `/kr/account/settlements` | MSTL | 정산 내역 |
| `/kr/account/preferences` | MALM | 알림·최애 멤버 |

---

## API 요약

### Store (공개)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/store/group-deals` | 공구 목록 (`?navigation=true` — 링크용, deposit 필터 완화) |
| GET | `/store/group-deals/:id` | 공구 상세 + options |
| GET | `/store/group-deals/by-product/:productId` | 상품 ID로 연결 공구 조회 |
| POST | `/store/group-deals/:id/join` | 참여 → `cart_id` |
| POST | `/store/group-deals/:id/waitlist` | 대기자 등록 |
| GET | `/store/products/search-index` | AI/Flask 색인용 상품 피드 |

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
| GET | `/store/me/group-deals/participations` | 내 참여 목록 |
| POST | `/store/me/group-deals/participations/:id/confirm-delivery` | 수령 확인 |
| GET | `/store/me/group-deals/hosted` | 총대 공구 |
| GET | `/store/me/group-deals/settlements` | 정산 내역 |
| GET/PUT | `/store/me/preferences` | 알림·선호 |
| GET/POST/DELETE | `/store/me/payment-methods` | 결제수단 |

### Storefront BFF (AI)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/api/ai/search?q=` | Flask 검색 → Medusa fallback |
| GET | `/api/ai/recommendations` | Flask 추천 |

---

## Excel v2 스펙 대비 현황

### 구현됨 (P0 UI/데이터)

- SRCH: 목록, 검색 2자+, 필터, 정렬, 빈자리 토글, 카드(멤버·신뢰·보증금·진행률)
- DETL: 신뢰도·보증금, 타임라인, 진행률, 가격·할인, 멤버 자리, 클라이언트 5분 홀드, 영수증 패널, 에스크로 안내
- MYJN/MYJD: 참여 탭, 참여 상세, 수령 확인
- 상품→공구 DETL 통합 UI

### 미구현 · 부분 구현 (후속)

| 스펙 | 내용 |
|------|------|
| APLY / CHKO / DONE | 신청·배송정보 / 에스크로 결제 / 완료 화면 분리 |
| DETL-05 (서버) | `POST /store/group-deals/:id/hold` — 동시성 락 |
| SRCH-03 (서버) | 빈자리 필터 서버 사이드 |
| SRCH-04 / ALRT | 자리 알림 대기등록 팝업 (가격 상한·푸시) |
| CRTE-05 / DEPO | Admin 3단계 + PG 보증금 예치 |
| HOME | 역할별 홈·급구(QFIL) 피드 |
| LIVE-01 | 실시간 상태 동기화 |
| MYJN-07 | D+7 자동 수령확정 cron |
| 총대 DASH~STLM | 대시보드·포장·구매인증·발송·정산 UI |

---

## 환경 변수

### 백엔드

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL |
| `JWT_SECRET` / `COOKIE_SECRET` | Admin·Store 인증 (고정 권장 — dev 재시작 시 세션 유지) |
| `TOSS_*` / `STRIPE_*` | 결제 PG |
| `REDIS_URL` | (선택) 프로덕션 세션 |

템플릿: `apps/backend/.env.template`

### 스토어프론트

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | `pk_` 키 |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | Medusa URL |
| `AI_ENGINE_URL` | Flask AI (검색·추천, 선택) |

템플릿: `apps/storefront/.env.template`

---

## 스크립트

| 명령 | 설명 |
|------|------|
| `pnpm dev` | 백엔드 + 스토어프론트 |
| `pnpm backend:dev` | Medusa :9000 |
| `pnpm storefront:dev` | Next.js :8000 |
| `pnpm build` | 전체 빌드 |
| `pnpm --filter @dtc/backend test:unit` | 백엔드 단위 테스트 |

---

## 트러블슈팅

| 증상 | 해결 |
|------|------|
| Admin 로그인 후 401 / 튕김 | `admin@test.com` / `supersecret`, 쿠키 삭제, `JWT_SECRET`·`COOKIE_SECRET` 고정, `localhost` 통일 |
| `-102` / 연결 거부 | `apps/backend`에서 `pnpm dev` 실행 중인지 확인 |
| `publishable key` 오류 | Admin에서 `pk_` 재발급 · Sales Channel 연결 |
| 랜딩에 Mock만 보임 | Admin에서 Open + deposited 공구 등록 |
| 상품 클릭 시 일반 PDP | 해당 상품에 Group Deal 미연결 → DETL 미리보기는 표시, 참여는 Admin 공구 생성 필요 |
| 상품 클릭 시 공구 상세 없음 | Group Deal **Open** 상태인지 확인 |
| AI 검색 동작 안 함 | Flask `http://localhost:5000` 기동, `AI_ENGINE_URL` 설정 |

---

## 알려진 제한사항

| 항목 | 현황 |
|------|------|
| **자리 홀드** | 클라이언트 5분 타이머만 (서버 API 미구현) |
| **참여 플로우** | DETL → checkout (APLY/CHKO/DONE 분리 없음) |
| **보증금 Admin** | PG 예치 3단계 wizard 미구현 |
| **2차 배송비** | 워크플로 골격만 |
| **알림** | metadata 로그만, 실제 발송 없음 |
| **Flask 연동** | 스토어프론트·BFF 준비됨 — Flask 쪽 API 구현 필요 (`docs/api-contract-for-merge.md`) |

상세 To-Do: **[PROJECT_STATUS.md](./PROJECT_STATUS.md)**

---

## 문서

| 문서 | 설명 |
|------|------|
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | 아키텍처·API·To-Do 상세 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel + Supabase 배포 |
| [docs/domain-contract-for-merge.md](./docs/domain-contract-for-merge.md) | 도메인 계약 (하이브리드) |
| [docs/api-contract-for-merge.md](./docs/api-contract-for-merge.md) | Flask API 계약 |
| `_spec_extract_v2.txt` | Excel v2 스펙 추출 |

---

## GitHub 업로드 시

**제외:** `.env`, `.env.local`, `node_modules/`, `.next/`, `.medusa/`, `dist/`

**포함:** 소스, `.env.template`, `pnpm-lock.yaml`, `README.md`, `docs/`, 스펙 추출본(선택)

---

## 라이선스

MIT (Medusa 스타터 기반)
