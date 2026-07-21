# Group Buying Site (BiasBuy / 아이돌 공구몰)

Medusa v2 + Next.js 15 기반 **K-POP 굿즈 공동구매(Group Deal)** 플랫폼입니다.  
총대(리더) 보증금, 참여자 가상계좌 입금, 멤버별 자리 선택, 대기자(waitlist) 매칭, Document AI 송장·영수증 분석, 수령 확인 후 정산까지 공동구매 특화 도메인을 Medusa 커스텀 모듈로 구현했습니다.

**GitHub:** https://github.com/yjj0066/group_buying

> **기준 문서:** `아이돌공구-기능정의서 (2).xlsx` (v3)  
> 추출본: `_spec_extract_v3.txt`

| 서비스 | URL |
|--------|-----|
| 랜딩 홈 | http://localhost:8000/kr |
| **공동구매 목록 (SRCH)** | http://localhost:8000/kr/group-buying |
| 전체 상품 (레거시) | http://localhost:8000/kr/store |
| **공구 앱 홈 (GB App)** | http://localhost:8000/kr/home *(로그인 필요)* |
| **공구 상세 (DETL)** | http://localhost:8000/kr/deals/{dealId} |
| **가상계좌 입금 (CHKO)** | http://localhost:8000/kr/deals/{dealId}/deposit |
| **총대 대시보드** | http://localhost:8000/kr/seller/deals/{dealId} |
| **총대 송장·배송 (SHIP)** | http://localhost:8000/kr/seller/deals/{dealId}/shipping |
| **최종 정산 (STLM)** | http://localhost:8000/kr/seller/deals/{dealId}/settlement |
| **총대 리포트 (RPTG)** | http://localhost:8000/kr/seller/deals/{dealId}/report |
| **내 공구 관리 (총대)** | http://localhost:8000/kr/my/hosted |
| **공구 앱 마이** | http://localhost:8000/kr/my |
| Admin | http://localhost:9000/app |
| Medusa API | http://localhost:9000 |
| Document AI BFF (선택) | http://localhost:5000 |

> `http://localhost:9000/` 에서 `Cannot GET /` 가 보이면 **정상**입니다. Admin은 `/app` 으로 접속합니다.

---

## 최근 반영 사항 (2026-07-21)

### Document AI · 송장/영수증 분석

| 기능 | 설명 | 주요 파일 |
|------|------|-----------|
| **영수증 AI (PURC)** | 구매 증빙 업로드 → BFF/스텁 파싱 → Admin 검증 게이트 | `tracking/parse`, `receipt/parse`, `group-deal-document-ai.ts` |
| **송장 AI (SHIP)** | 택배 송장 이미지/PDF 업로드 → 참여자 매칭 테이블 자동 채움 | `leader-shipping-prep-view/`, `leader-tracking-match.ts` |
| **매칭 사유 컬럼** | `확인 필요` 행에 미매칭·택배사 누락 등 사유 표시 | `matchReviewReasons` i18n |
| **BFF 연동** | `services/document-ai-bff` (Flask, Upstage) — `HYBRID_API_URL`, `HYBRID_API_SHARED_SECRET` | `flask-document-ai-client.ts` |
| **업로드 용량** | Server Actions `32mb`, 백엔드 문서 업로드 상한 별도 설정 | `next.config.js`, `group-deal-document-upload.ts` |

**송장 자동 매칭 조건:** 송장번호·택배사 추출 + 참여자 이름(및 동명이인 시 주소) 매칭 + confidence ≥ 0.85

**배송 전 필수:** Admin → Group Deals → Leader Management → **Verify Receipt** (영수증 `verified`)

### 발송 확정 · 정산 · 계좌

| 기능 | 설명 | 주요 파일 |
|------|------|-----------|
| **발송 확정 API** | `POST /store/me/group-deals/:id/shipping/complete` — 운송장 일괄 저장 + 알림 | `group-deal-leader-ops.ts`, `shipping/complete/route.ts` |
| **최종 정산 API** | `POST /store/me/group-deals/:id/settlement` — 정산 계좌 저장 + `settlement_submitted_at` | `settlement/route.ts` |
| **정산 입금 계좌 UI** | 은행·계좌번호·예금주 직접 입력 | `leader-settlement/bank-account-form.tsx` |
| **가입 계좌 불러오기** | `customer.metadata.refund_bank_account` — 「이 계좌 사용하기」로 전 필드 자동 입력 | `getBankAccount()`, `account-group-deals.ts` |
| **내 공구 관리** | 정산 완료 공구 → **`종료`** 표시, 클릭 시 **총대 리포트**로 이동 | `hosted-deals-list/`, `seller-deal-metrics.ts` |

### 오류 처리 · UX 개선

| 증상 | 조치 |
|------|------|
| `An unknown error occurred.` | Server Action이 `{ ok, error }` 반환 + `resolveMedusaErrorMessage()` duck-typing |
| `Shipping complete failed on the server.` | workflow 대신 `processGroupDealShippingComplete()` 직접 호출 + route try/catch |
| 영수증 미검증 시 송장/발송 차단 | 한국어 가드 메시지 (`purchase-receipt-guard-message.ts`) |
| Admin `-102` | 백엔드 미기동 — `pnpm backend:dev` |
| i18n layout 오류 | locale 헤더·사전 폴백·하드 네비게이션 (언어 전환) |

### 총대 10단계 흐름 (요약)

```
개설 → 보증금 → 모집 → 구매증빙(PURC) → 개봉/배분 → 송장(SHIP) → 발송 확정 → 정산(STLM) → 종료(리포트)
```

| 단계 | 경로 |
|------|------|
| 송장 업로드·매칭 | `/seller/deals/{id}/shipping` |
| 발송 확정 | 동일 화면 **발송 확정** 버튼 |
| 최종 정산 | `/seller/deals/{id}/settlement` |
| 총대 리포트 | `/seller/deals/{id}/report` |
| 내 공구 목록 | `/my/hosted` — 정산 완료 시 **종료** + 리포트 링크 |

---

## 최근 반영 사항 (2026-07-20)

### UX · 네비게이션 · SRCH 필터

- 상단 검색 → `/group-buying?q=` (공동구매 통합)
- KRW 전용 — 통화 선택 UI 제거
- 아이돌 그룹·굿즈 종류·가격 범위 필터 + URL 동기화
- `POST /store/group-deals/:id/apply` 참여 신청 API
- 총대 개설: 날짜 ISO 정규화, `member_seats`/`idol_group`/`goods_type` validator

---

## 주요 기능

### 공동구매 도메인

| 기능 | 설명 |
|------|------|
| **가상계좌 입금 (v3)** | join/apply → VA 발급 → `/deposit` — 5분 `payment_deadline` |
| **총대 보증금** | `deposit_status=deposited` — 목록 노출·신뢰 배지 |
| **Document AI** | 영수증·송장 OCR (BFF/스텁), 매칭 테이블, 검증 UI |
| **멤버/버전 옵션** | `GroupDealOption` — DETL 자리 선택 |
| **에스크로·waitlist** | 미결제 만료·공석 → 대기자 매칭 |
| **정산·보증금 환급** | 발송 완료 후 STLM, `settlement_submitted_at` |
| **Cron** | `group-deal-maintenance.ts` — 미결제 만료, D+7 자동 수령 확인 |

### 스토어프론트

| 기능 | 설명 |
|------|------|
| **공구 앱 (GB App)** | `(gb-app)` — 참여자/총대 모드, DETL→APLY→CHKO→DONE |
| **6개국어 UI** | ko / en / es / ru / zh / ja |
| **와이어프레임 라우트** | `lib/wireframe/routes.ts` — 화면 ID (SHIP, STLM, RPTG 등) |

### 운영·백오피스

| 기능 | 설명 |
|------|------|
| **Admin UI** | `src/admin/routes/group-deals/` — CRUD, **Verify Receipt** |
| **환불 계좌** | 가입 ACCT 단계 + `/my/account` 계좌 관리 |

---

## 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 모노레포 | pnpm workspace + Turbo | pnpm 10.11.1 |
| 백엔드 | Medusa Framework | **2.17.2** (`@dtc/backend`) |
| 스토어프론트 | Next.js (App Router, Turbopack) | **15.5.18** |
| UI | React | 19.0.5 |
| DB | PostgreSQL | 15+ |
| Document AI BFF | Flask + Upstage (선택) | Python 3.11+ |
| Node.js | >= 20 | |

---

## 프로젝트 구조

```
group-buying-site/
├── README.md
├── CODE_ANALYSIS.md
├── docs/
├── apps/
│   ├── backend/                         # @dtc/backend
│   │   └── src/
│   │       ├── modules/group-buying/
│   │       ├── api/store/me/group-deals/  # hosted, settlement, shipping/complete, tracking/parse
│   │       ├── api/store/me/bank-account/
│   │       ├── utils/group-deal-document-ai.ts
│   │       ├── utils/group-deal-leader-ops.ts
│   │       └── workflows/group-deal-escrow.ts
│   └── storefront/                      # @dtc/storefront
│       └── src/
│           ├── app/[countryCode]/(gb-app)/
│           ├── modules/group-buying/      # shipping, settlement, document-ai UI
│           └── lib/
│               ├── data/leader-shipping.ts
│               ├── data/leader-settlement.ts
│               ├── data/group-deal-document-ai.ts
│               └── util/leader-tracking-match.ts
└── services/
    └── document-ai-bff/                 # Flask BFF (선택)
```

---

## 빠른 시작

### 필요 환경

- **Node.js** v20+
- **pnpm** v10+
- **PostgreSQL**
- **(선택) Python 3.11+** — Document AI BFF

#### Windows 참고

- PowerShell에서 `pnpm`이 안 되면: `npm install -g pnpm` 후 **터미널 재시작**
- 앱별 실행: `pnpm backend:dev`, `pnpm storefront:dev`

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
cp services/document-ai-bff/.env.example services/document-ai-bff/.env   # AI 사용 시
```

**Backend** (`apps/backend/.env`) — 최소:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/group_buying
STORE_CORS=http://localhost:8000
ADMIN_CORS=http://localhost:5173,http://localhost:9000
AUTH_CORS=http://localhost:5173,http://localhost:9000
JWT_SECRET=dev-jwt-secret-change-in-production
COOKIE_SECRET=dev-cookie-secret-change-in-production

# Document AI (선택 — false면 스텁 데이터)
DOCUMENT_AI_ENABLED=false
HYBRID_API_URL=http://127.0.0.1:5000
HYBRID_API_SHARED_SECRET=your-shared-secret
```

**Storefront** (`apps/storefront/.env.local`):

```env
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_DEFAULT_REGION=kr
NEXT_PUBLIC_BASE_URL=http://localhost:8000
```

### 3. DB · 시드 · Admin

```bash
cd apps/backend
pnpm db:migrate
pnpm medusa user -e admin@test.com -p supersecret
pnpm seed:locales
pnpm seed:regions
pnpm seed:korea-toss
pnpm seed:group-buy-demo-product
```

### 4. 개발 서버 (3프로세스 — AI 사용 시)

```bash
# 터미널 1 — 백엔드
pnpm backend:dev          # :9000

# 터미널 2 — 스토어프론트
pnpm storefront:dev         # :8000

# 터미널 3 — Document AI BFF (DOCUMENT_AI_ENABLED=true 일 때)
cd services/document-ai-bff
python -m app.main          # :5000
```

또는 루트에서 `pnpm dev` (백엔드 + 스토어프론트만).

### 5. Publishable API Key

1. Admin → **Settings → Publishable API Keys** → Create
2. `pk_` 토큰 → Sales Channel 연결
3. `.env.local` 반영 후 **스토어프론트 재시작**

---

## 총대 Document AI · 배송 체크리스트

1. **Admin**에서 해당 공구 **Verify Receipt** 완료
2. `apps/backend` + `apps/storefront` 실행
3. AI 사용 시: BFF `:5000` 실행, `DOCUMENT_AI_ENABLED=true`, `UPSTAGE_API_KEY` 설정
4. **SHIP** 화면에서 송장 이미지 업로드 (송장번호·택배사·수령인명 포함 권장)
5. 미매칭 행은 **사유** 컬럼 확인 후 수동 입력
6. **발송 확정** → **정산(STLM)** → 입금 계좌 입력 또는 가입 계좌 불러오기
7. **내 공구 관리** 완료 탭에서 **종료** → **총대 리포트**

---

## API 요약 (총대 · Document AI)

### Store — 인증 (`/store/me/group-deals`)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/store/me/group-deals/hosted` | 총대 공구 목록 |
| POST | `/store/me/group-deals/:id/receipt/parse` | 구매 영수증 AI 파싱 |
| POST | `/store/me/group-deals/:id/tracking/parse` | 송장 AI 파싱 |
| POST | `/store/me/group-deals/:id/shipping/complete` | 발송 확정 (운송장 저장) |
| POST | `/store/me/group-deals/:id/settlement` | 최종 정산 신청 |
| GET/POST | `/store/me/bank-account` | 환불·정산 계좌 조회/저장 |

### Store — 참여

| Method | 경로 | 설명 |
|--------|------|------|
| POST | `/store/group-deals/:id/apply` | 참여 신청 (인증) |
| POST | `/store/group-deals/:id/deposit-confirm` | VA 입금 확인 |
| GET | `/store/me/group-deals/participations` | 내 참여 목록 |

상세: **[CODE_ANALYSIS.md](./CODE_ANALYSIS.md)** · **[docs/api-contract-for-merge.md](./docs/api-contract-for-merge.md)**

---

## 프로젝트 공유 (ZIP)

소스만 압축 (`.env`, `node_modules` 제외). **압축 후 README 수정은 zip에 반영되지 않음** — 다시 압축 필요.

**Windows (cmd):**

```cmd
cd /d C:\path\to\group-buying-site
tar -a -c -f group-buying-site-share.zip ^
  --exclude=node_modules --exclude=.next --exclude=.medusa ^
  --exclude=.venv --exclude=.turbo --exclude=dist --exclude=.git ^
  --exclude=apps/backend/.env --exclude=apps/storefront/.env.local ^
  --exclude=services/document-ai-bff/.env .
```

받는 쪽: `pnpm install` → env 템플릿 복사 → `pnpm db:migrate` → `pnpm dev`

---

## 트러블슈팅

| 증상 | 해결 |
|------|------|
| **`An unknown error occurred.`** | 백엔드 로그 확인. 영수증 Verify Receipt, BFF 실행 여부 확인. 스토어프론트 재시작 |
| **송장 업로드 실패** | BFF `:5000`, `DOCUMENT_AI_ENABLED`, `HYBRID_API_SHARED_SECRET` 일치 확인 |
| **발송 확정 실패** | Admin Verify Receipt, 모든 참여자 운송장 입력, 백엔드 재시작 |
| **정산 계좌 번호 재입력** | 예전 등록 계좌는 마스킹만 저장됨 → **계좌 관리**에서 한 번 다시 저장 |
| **자동 매칭 0건** | 송장 이미지에 **송장번호** 열 필요. 테스트 이미지는 수령인명·주소 확인 |
| **Body exceeded 1 MB** | `next.config.js` `serverActions.bodySizeLimit: "32mb"` 적용 여부 확인 |
| **Error -102** (Admin) | `pnpm backend:dev` |
| **`/kr/home` → 로그인** | 정상. 비로그인 쇼핑은 `/kr/group-buying` |

---

## 스크립트

| 명령 | 설명 |
|------|------|
| `pnpm dev` | 백엔드 + 스토어프롌트 |
| `pnpm backend:dev` | Medusa :9000 |
| `pnpm storefront:dev` | Next.js :8000 |
| `pnpm build` | 전체 빌드 |
| `pnpm --filter @dtc/backend seed:group-buy-demo-product` | 데모 상품 시드 |
| `pnpm --filter @dtc/storefront test` | 스토어프론트 Vitest (매칭 유틸 등) |

---

## 알려진 갭 · 미구현

| 항목 | 상태 |
|------|------|
| CHKO-02 | 실제 은행 webhook 입금 자동 확인 (stub) |
| Upstage OCR | BFF 연동 가능 — `docs/upstage-receipt-integration.md` |
| 소셜 로그인 | 미구현 |

---

## 문서

| 문서 | 설명 |
|------|------|
| [CODE_ANALYSIS.md](./CODE_ANALYSIS.md) | 코드 레이어·패턴·파일 맵 |
| [docs/domain-contract-for-merge.md](./docs/domain-contract-for-merge.md) | 도메인 계약 |
| [docs/api-contract-for-merge.md](./docs/api-contract-for-merge.md) | API 계약 |

---

## GitHub / ZIP 업로드 시 제외

`.env`, `.env.local`, `node_modules/`, `.next/`, `.medusa/`, `.venv/`, `dist/`

---

## 라이선스

MIT (Medusa 스타터 기반)
