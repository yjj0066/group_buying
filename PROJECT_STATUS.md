# Group Buying Site — 프로젝트 상태

> **목적:** `group-buying-site` 모노레포의 구현 현황, 최근 변경, 운영 요건, 로드맵을 한 문서에서 파악하기 위한 상태 문서  
> **최종 갱신:** 2026-07-21  
> **관련 문서:** [README.md](./README.md) · [CODE_ANALYSIS.md](./CODE_ANALYSIS.md) · [docs/](./docs/)

| 문서 | 설명 |
|------|------|
| [README.md](./README.md) | 빠른 시작, URL 맵, 트러블슈팅 |
| [CODE_ANALYSIS.md](./CODE_ANALYSIS.md) | 코드 레이어·패턴·파일 맵 |
| [docs/api-contract-for-merge.md](./docs/api-contract-for-merge.md) | Store API 계약 |
| [docs/domain-contract-for-merge.md](./docs/domain-contract-for-merge.md) | 도메인 계약 |
| [docs/upstage-receipt-integration.md](./docs/upstage-receipt-integration.md) | Upstage OCR 연동 가이드 |

---

## 프로젝트 스냅샷

**BiasBuy / 아이돌 공구몰** — Medusa v2 커스텀 모듈 위에 K-POP 굿즈 공동구매(Group Deal) 도메인을 구현한 3-tier 모노레포.

**GitHub:** https://github.com/yjj0066/group_buying

### 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 모노레포 | pnpm workspace + Turbo | pnpm 10.11.1 |
| 백엔드 | Medusa Framework (`@dtc/backend`) | **2.17.2** |
| 스토어프론트 | Next.js App Router + Turbopack | **15.5.18** |
| UI | React | 19.0.5 |
| DB | PostgreSQL | 15+ |
| Document AI BFF | Flask + Upstage (선택) | Python 3.11+ |
| Node.js | — | >= 20 |

### 저장소 구조 (요약)

```
group-buying-site/  →  apps/backend (Medusa) + apps/storefront (Next.js) + services/document-ai-bff (선택 Flask BFF)
```

| 서비스 | 로컬 URL |
|--------|----------|
| 스토어프론트 | http://localhost:8000 |
| Medusa API / Admin | http://localhost:9000 / http://localhost:9000/app |
| Document AI BFF (선택) | http://localhost:5000 |

---

## 현재 구현 상태 (기능별)

상태 표기: **[완료]** / **[부분]** / **[미구현]**

### 참여자 Flow (APLY → CHKO → MYJN)

| 항목 | 상태 | 비고 |
|------|------|------|
| 공구 상세 (DETL) — 멤버/버전 자리 선택 | [완료] | `GroupDealOption`, GB App `/deals/{dealId}` |
| 참여 신청 (APLY) | [완료] | `POST /store/group-deals/:id/apply`, `submitDealApplication()` |
| 가상계좌 발급 + 5분 결제 기한 | [완료] | join/apply → VA, `/deals/{dealId}/deposit` |
| 입금 확인 (CHKO) | [부분] | `deposit-confirm` API·소유권 검증 완료; **실제 은행 webhook은 stub (CHKO-02)** |
| 내 참여 목록 (MYJN) | [완료] | `GET /store/me/group-deals/participations`, 빈 배열 정상 반환 |
| 대기자(waitlist) 매칭 | [완료] | `group-deal-escrow.ts` workflow |
| 레거시 PG 카트 결제 경로 | [부분] | `cart_id` → `/checkout` 분기 유지, VA 경로가 v3 기본 |

### SRCH 필터 (2026-07-20)

| 항목 | 상태 | 비고 |
|------|------|------|
| 상단 검색 → 공동구매 통합 | [완료] | `/group-buying?q=` (`buildGroupBuyingSearchPath()`) |
| 아이돌 그룹·굿즈 종류·가격 범위 필터 | [완료] | `search-filter-bar/`, URL 동기화 |
| KRW 전용 | [완료] | 통화 선택 UI 제거 |
| 서버 사이드 페이지네이션/필터 | [미구현] | 클라이언트 필터 — 대규모 목록 시 부하 가능 |

### 총대 10단계 Flow

```
개설 → 보증금 → 모집 → 구매증빙(PURC) → 개봉/배분 → 송장(SHIP) → 발송 확정 → 정산(STLM) → 리포트(RPTG) → 종료
```

| 단계 | 화면 ID | 상태 | 경로 / 구현 |
|------|---------|------|-------------|
| 1. 개설 | — | [완료] | 총대 공구 생성, 날짜 ISO 정규화, validator |
| 2. 보증금 | — | [완료] | `deposit_status=deposited` — 목록 노출·신뢰 배지 |
| 3. 모집 | — | [완료] | OPEN / MINIMUM_REACHED, 참여자 apply |
| 4. 구매증빙 | PURC | [완료] | `/seller/deals/{id}/purchase-proof`, `receipt/parse` |
| 5. 개봉/배분 | — | [완료] | `/seller/deals/{id}/opening` |
| 6. 송장 업로드·매칭 | SHIP | [완료] | `/seller/deals/{id}/shipping`, `tracking/parse` |
| 7. 발송 확정 | SHIP | [완료] | `POST .../shipping/complete`, `processGroupDealShippingComplete()` |
| 8. 최종 정산 | STLM | [완료] | `/seller/deals/{id}/settlement`, `settlement/route.ts` |
| 9. 총대 리포트 | RPTG | [완료] | `/seller/deals/{id}/report` |
| 10. 종료 | MYHD | [완료] | `/my/hosted` — 정산 완료 시 **종료** + 리포트 링크 |

### Document AI (영수증·송장 파싱, BFF)

| 항목 | 상태 | 비고 |
|------|------|------|
| 영수증 AI 파싱 (PURC) | [완료] | `receipt/parse`, BFF/스텁, `ai-verification-panel/` |
| 송장 AI 파싱 (SHIP) | [완료] | `tracking/parse`, 참여자 매칭 테이블 자동 채움 |
| 매칭 사유 컬럼 | [완료] | `ShippingMatchReviewReason`, `matchReviewReasons` i18n |
| Flask BFF (Upstage OCR) | [완료] | `services/document-ai-bff`, `HYBRID_API_URL` + shared secret |
| 스텁 모드 (AI OFF) | [완료] | `DOCUMENT_AI_ENABLED=false` → `document-extract-stub` |
| 업로드 용량 (32mb) | [완료] | `next.config.js` Server Actions, 백엔드 별도 상한 |
| 자동 매칭 조건 | [완료] | 송장번호·택배사 + 이름(동명이인 시 주소) + confidence ≥ 0.85 |

### Admin Verify Receipt 게이트

| 항목 | 상태 | 비고 |
|------|------|------|
| Admin UI — Verify Receipt | [완료] | `src/admin/routes/group-deals/` |
| 송장 파싱 전 게이트 | [완료] | `assertPurchaseReceiptVerified()` |
| 발송 확정 전 게이트 | [완료] | `purchase_receipt_status === verified` 아니면 NOT_ALLOWED |
| 한국어 가드 메시지 | [완료] | `purchase-receipt-guard-message.ts` |

### 발송 확정 (`processGroupDealShippingComplete`)

| 항목 | 상태 | 비고 |
|------|------|------|
| 운송장 일괄 저장 + 알림 emit | [완료] | `group-deal-leader-ops.ts` |
| workflow 대신 직접 호출 | [완료] | 2026-07-21 — generic 500 묻힘 방지 |
| route try/catch | [완료] | `shipping/complete/route.ts` → `respondWithRouteError` |
| 참여자 row만 submit | [완료] | orphan/unmatched upload row 제외 |

### 정산 + 계좌 (전체 `account_number` metadata 저장)

| 항목 | 상태 | 비고 |
|------|------|------|
| 최종 정산 API | [완료] | `POST .../settlement`, `settlement_submitted_at` |
| 정산 입금 계좌 UI | [완료] | `leader-settlement/bank-account-form.tsx` |
| 가입 계좌 불러오기 | [완료] | `GET/POST /store/me/bank-account`, 「이 계좌 사용하기」 |
| 전체 계좌번호 metadata 저장 | [완료] | 2026-07-21 — `account_number` + `account_number_masked` |
| 레거시 마스킹-only 계좌 | [부분] | 재저장 필요 — `registeredAccountResaveRequired` 안내 |

### 내 공구 관리 (Hosted deals — 종료 → 리포트 링크)

| 항목 | 상태 | 비고 |
|------|------|------|
| 총대 공구 목록 (MYHD) | [완료] | `/my/hosted`, `hosted-deals-list/` |
| 정산 완료 → **종료** 표시 | [완료] | `isHostedDealSettlementComplete()`, `stageClosed` i18n |
| 카드 클릭 → RPTG | [완료] | `resolveHostedDealLink()` |
| RPTG → `/my/hosted` 백 링크 | [완료] | `report/page.tsx` |
| localStorage runtime overrides | [부분] | `applyHostedDealRuntimeOverrides()` — dev/demo용 |

### 오류 처리 (`{ ok, error }`, `resolveMedusaErrorMessage`)

| 항목 | 상태 | 비고 |
|------|------|------|
| Server Action discriminated union | [완료] | throw 대신 `{ ok: true, data }` / `{ ok: false, error }` |
| `resolveMedusaErrorMessage()` | [완료] | FetchError duck-typing, 한국어 contextual fallback |
| 백엔드 `respondWithRouteError` | [완료] | MedusaError / ZodError → HTTP JSON |
| `An unknown error occurred.` 치환 | [완료] | Document AI 503 / generic server 안내 |
| Vitest — `medusa-error.spec.ts` | [완료] | — |
| `tracking/parse` route 공통 handler | [부분] | route-local duplicate — `route-error.ts` 미적용 |

### i18n (6개 로케일)

| 항목 | 상태 | 비고 |
|------|------|------|
| ko / en / es / ru / zh / ja | [완료] | GB App·SHIP·STLM 라벨 포함 |
| locale 헤더·사전 폴백 | [완료] | 언어 전환 하드 네비게이션 |
| 2026-07-21 추가 키 | [완료] | `matchReviewReasons.*`, `stageClosed`, Document AI 오류 문구 |

### Cron / Maintenance

| 항목 | 상태 | 비고 |
|------|------|------|
| 미결제 만료 | [완료] | `jobs/group-deal-maintenance.ts` |
| D+7 자동 수령 확인 | [완료] | 동일 cron job |
| 에스크로·waitlist workflow | [완료] | `workflows/group-deal-escrow.ts` |

### 레거시

| 항목 | 상태 | 비고 |
|------|------|------|
| Flask product search (`/store?q=`) | [부분] | 기본 OFF (`lib/config/flask-search.ts`) |
| 카트 checkout PG 경로 | [부분] | `(checkout)` route group, VA 경로가 v3 기본 |
| `(main)` vs `(gb-app)` 이중 라우트 | [부분] | 목록·상세·마이 경로 병행 |

---

## 2026-07-21 변경 이력

- **Document AI — 영수증 (PURC):** BFF/스텁 파싱, Admin 검증 게이트 (`receipt/parse`, `group-deal-document-ai.ts`)
- **Document AI — 송장 (SHIP):** 송장 OCR → 참여자 매칭 테이블 자동 채움 (`tracking/parse`, `leader-tracking-match.ts`, `leader-shipping-prep-view/`)
- **매칭 사유 컬럼:** `확인 필요` 행에 미매칭·택배사 누락 등 사유 표시 (`ShippingMatchReviewReason`, `matchReviewReasons` i18n)
- **발송 확정:** workflow 제거, `processGroupDealShippingComplete()` route에서 직접 호출 + try/catch
- **오류 처리:** Server Action `{ ok, error }` 패턴 + `resolveMedusaErrorMessage()` duck-typing (`medusa-error.ts`, `route-error.ts`)
- **정산 계좌:** 가입 계좌 불러오기, metadata에 전체 `account_number` 저장 (`bank-account/route.ts`, `bank-account-form.tsx`)
- **내 공구 관리:** 정산 완료 → **종료** 표시, RPTG 링크 (`seller-deal-metrics.ts`, `hosted-deals-list/`)
- **RPTG 백 링크:** report → `/my/hosted`
- **영수증 미검증 가드:** 송장/발송 차단 한국어 메시지 (`purchase-receipt-guard-message.ts`)
- **업로드 용량:** Server Actions 32mb, 백엔드 문서 업로드 상한 별도 설정
- **3프로세스 dev:** `DOCUMENT_AI_ENABLED=true` 시 BFF 별도 실행 필요 문서화

---

## 2026-07-20 변경 이력

- 상단 검색 → `/group-buying?q=` 공동구매 통합 (레거시 `/store?q=` 대체)
- KRW 전용 — EUR/USD/KRW 통화 선택 UI 제거
- SRCH 필터: 아이돌 그룹(검색형), 굿즈 종류, 가격 범위(슬라이더+입력), URL 동기화
- `POST /store/group-deals/:id/apply` 참여 신청 API 연동
- 내 참여 목록: 빈 배열 정상 반환, `deposit-confirm` 소유권 검증
- 총대 개설: 날짜 ISO 정규화, `member_seats`/`idol_group`/`goods_type` validator, 데모 상품 시드

---

## 알려진 이슈 / 제한사항

| 항목 | 설명 |
|------|------|
| **VA webhook stub (CHKO-02)** | 가상계좌 입금 자동 확인 미구현. `deposit-confirm`은 수동/스텁. 실제 은행 webhook adapter 필요 |
| **레거시 bank accounts** | 예전 등록 계좌는 `account_number_masked`만 저장. STLM 「이 계좌 사용하기」 시 재저장 안내 |
| **이중 route tree** | `(main)/group-buying` + `(gb-app)/deals` 병행. 목록·상세·마이 URL이 두 벌 존재 |
| **localStorage runtime overrides** | `applyHostedDealRuntimeOverrides()` — hosted deal stage가 client storage에 의존 (dev/demo) |
| **Document AI 3프로세스** | `DOCUMENT_AI_ENABLED=true` 시 Medusa + Next.js + Flask BFF 동시 기동 필요 |
| **Vitest path alias** | 일부 storefront 테스트에서 path alias 해석 이슈 가능 (`leader-tracking-match.spec.ts` 등) |
| **CHKO-03** | 5분 payment hold가 client-only — 서버 사이드 seat hold 미구현 |
| **MTRS Reviews** | metadata 기반 — 정규화된 Review 엔티티 없음 |
| **정산 계좌 보안** | 전체 `account_number`가 customer metadata에 저장 — production at-rest 암호화 정책 검토 필요 |
| **소셜 로그인** | [미구현] |

---

## 운영 체크리스트

### 개발 서버 기동 (3 터미널 — Document AI 사용 시)

```bash
# 터미널 1 — 백엔드
pnpm backend:dev          # :9000

# 터미널 2 — 스토어프론트
pnpm storefront:dev       # :8000

# 터미널 3 — Document AI BFF (DOCUMENT_AI_ENABLED=true 일 때)
cd services/document-ai-bff
python -m app.main        # :5000
```

루트 `pnpm dev`는 백엔드 + 스토어프론트만 기동한다.

### DB 초기 설정 (최초 1회)

```bash
cd apps/backend
pnpm db:migrate
pnpm medusa user -e admin@test.com -p supersecret
pnpm seed:locales
pnpm seed:regions
pnpm seed:korea-toss
pnpm seed:group-buy-demo-product
```

### Publishable API Key

1. Admin → **Settings → Publishable API Keys** → Create
2. `pk_` 토큰 → Sales Channel 연결
3. `apps/storefront/.env.local` 반영 후 **스토어프론트 재시작**

### 총대 SHIP 단계 전 Verify Receipt

1. Admin → Group Deals → Leader Management → **Verify Receipt** 완료
2. `purchase_receipt_status === verified` 확인
3. 이후 송장 파싱·발송 확정 진행 가능

### 환경 변수 요약

| 파일 | 필수 변수 | 선택 변수 |
|------|-----------|-----------|
| `apps/backend/.env` | `DATABASE_URL`, `STORE_CORS`, `JWT_SECRET`, `COOKIE_SECRET` | `DOCUMENT_AI_ENABLED`, `HYBRID_API_URL`, `HYBRID_API_SHARED_SECRET` |
| `apps/storefront/.env.local` | `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | `NEXT_PUBLIC_DEFAULT_REGION`, `NEXT_PUBLIC_BASE_URL` |
| `services/document-ai-bff/.env` | — (AI 사용 시) | `UPSTAGE_API_KEY`, `HYBRID_API_SHARED_SECRET` |

### 트러블슈팅 빠른 참조

| 증상 | 확인 사항 |
|------|-----------|
| `An unknown error occurred.` | 백엔드 로그, Verify Receipt, BFF 실행, 스토어프론트 재시작 |
| 송장 업로드 실패 | BFF `:5000`, `DOCUMENT_AI_ENABLED`, shared secret 일치 |
| 발송 확정 실패 | Admin Verify Receipt, 모든 참여자 운송장 입력 |
| Admin Error -102 | `pnpm backend:dev` 미기동 |
| Body exceeded 1 MB | `next.config.js` `serverActions.bodySizeLimit: "32mb"` |

---

## 다음 우선순위 (로드맵)

CODE_ANALYSIS 기술 부채·확장 가이드 기준 우선순위:

1. **CHKO-02 VA webhook** — 실제 은행 입금 webhook adapter + 서버 사이드 seat hold (CHKO-03)
2. **Route error handler 통합** — `receipt/parse`, `tracking/parse` → 공유 `respondWithRouteError`
3. **Route tree consolidation** — `(main)/group-buying` vs `(gb-app)/deals` 단일화
4. **서버 사이드 SRCH 필터** — `GET /store/group-deals` query params 확장, URL param 유지
5. **Bank account metadata 암호화** — production at-rest 정책
6. **Integration tests** — receipt verify → tracking parse → shipping complete → settlement E2E
7. **MTRS Review 엔티티** — metadata 의존 → 정규화된 Review 모델

---

## 배포 상태

| 대상 | 요건 |
|------|------|
| **최종 사용자** | 웹 브라우저만 필요. 별도 클라이언트 설치 없음 |
| **개발 환경** | Node.js 20+, pnpm 10+, PostgreSQL 15+ |
| **Document AI 사용 시** | Python 3.11+, Flask BFF 프로세스 추가 |
| **프로덕션 (권장)** | Medusa backend + Next.js storefront + PostgreSQL. BFF는 OCR 필요 시에만 |
| **Admin** | Medusa Admin UI (`/app`) — Verify Receipt 등 운영 기능 |

현재 저장소는 **로컬 개발·데모 기준**으로 문서화되어 있으며, 프로덕션 배포 파이프라인(CI/CD, 호스팅)은 별도 구성이 필요하다.

---

*본 문서는 2026-07-21 시점 README·CODE_ANALYSIS·코드베이스 정적 분석을 바탕으로 작성되었습니다.*
