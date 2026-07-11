# Group Buying Site — 코드 분석 보고서

> 작성 기준: `group-buying-site` 모노레포 (Medusa v2.17.2 + Next.js 15.5.18)  
> 대상 독자: 프로젝트에 합류하는 개발자, 기획·운영 담당자

---

## 1. 프로젝트 개요

### 1.1 목적

K-POP 아이돌 굿즈를 대상으로 한 **공동구매 + 수요조사** 커머스 플랫폼입니다. Medusa v2를 백엔드로, Next.js를 스토어프론트로 사용하며, 다음 요구사항을 반영했습니다.

- 목표 인원 달성 시 할인가 적용 (공동구매)
- 제작 전 수요조사 단계에서 관심 표시 수집
- 제작 진행 상태 시각화 (5단계 타임라인)
- 글로벌 팬 대상 6개국어 UI
- 상품명(고유명사)은 원본 유지, UI·설명만 다국어

### 1.2 시스템 구성

```
┌─────────────────────────────────────────────────────────────┐
│                    고객 브라우저                              │
│              http://localhost:8000/kr                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Next.js 15 Storefront (apps/storefront)         │
│  - App Router, Server Actions, i18n Provider                 │
│  - Medusa JS SDK → Store API 호출                            │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (REST)
┌──────────────────────────▼──────────────────────────────────┐
│              Medusa v2 Backend (apps/backend)                │
│  - Custom Group Buying Module                                │
│  - Demand Survey Workflow (Product Metadata)                 │
│  - Translation Module                                        │
│  - Admin Dashboard: /app                                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    PostgreSQL                                │
│  - Medusa 코어 테이블 (product, order, cart, ...)           │
│  - group_deal, group_deal_participant (커스텀)               │
│  - 수요조사: product.metadata JSON 필드                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 기술 스택 상세

| 계층 | 기술 | 버전 | 역할 |
|------|------|------|------|
| 런타임 | Node.js | ≥20 | 서버 실행 환경 |
| 패키지 | pnpm workspaces | 10.11.1 | 모노레포 의존성 관리 |
| 빌드 | Turbo | 2.x | 멀티 앱 빌드 오케스트레이션 |
| 백엔드 프레임워크 | Medusa | 2.17.2 | 커머스 API, Admin, 워크플로 |
| ORM | MikroORM (Medusa 내장) | — | DB 접근 |
| 프론트엔드 | Next.js | 15.5.18 | SSR/SSG, App Router |
| UI 라이브러리 | React | 19.0.5 | 컴포넌트 |
| 스타일 | Tailwind CSS | 3.x | 유틸리티 CSS |
| 결제 | Stripe | 8.x | 체크아웃 결제 |
| DB | PostgreSQL | 15+ | 영구 저장소 |
| 캐시(선택) | Redis / in-memory | — | Medusa 이벤트·캐시 |

---

## 3. 백엔드 아키텍처 분석

### 3.1 커스텀 모듈: Group Buying

**위치:** `apps/backend/src/modules/group-buying/`

Medusa v2 **Custom Module** 패턴을 따릅니다.

| 파일 | 역할 |
|------|------|
| `index.ts` | 모듈 등록 (`GROUP_BUYING_MODULE` 상수) |
| `service.ts` | `MedusaService` 기반 CRUD |
| `models/index.ts` | `GroupDeal`, `GroupDealParticipant` 엔티티 정의 |
| `migrations/Migration20250710120000.ts` | `group_deal`, `group_deal_participant` 테이블 생성 |

**GroupDeal 엔티티 주요 필드:**

- `product_id`, `variant_id` — 연결 상품 (텍스트 ID, Module Link 미사용)
- `target_quantity`, `current_quantity` — 목표/현재 참여 수량
- `original_price`, `deal_price`, `currency_code` — 가격 정보
- `status` — `draft | active | success | failed | cancelled`
- `starts_at`, `ends_at` — 캠페인 기간

**GroupDealParticipant 엔티티:**

- `email`, `quantity`, `customer_id`, `order_id`
- `status` — `pending | confirmed | cancelled`

### 3.2 워크플로 (Workflows)

**`workflows/group-deals.ts`**

```
createGroupDealWorkflow
  └─ createGroupDealStep → group_deal INSERT
     └─ (롤백) deleteGroupDeals

joinGroupDealWorkflow
  └─ joinGroupDealStep
       ├─ 상태·기간 검증 (active, starts_at~ends_at)
       ├─ participant INSERT
       ├─ current_quantity += quantity
       └─ target 달성 시 status → success
     └─ (롤백) participant DELETE + quantity/status 복원
```

**`workflows/demand-survey.ts`**

```
joinDemandSurveyWorkflow
  └─ joinDemandSurveyStep
       ├─ Product Query로 metadata 조회
       ├─ production_stage === demand_survey 검증
       ├─ participant_id 중복 검사
       └─ metadata.participation_current += 1
```

수요조사는 **별도 DB 테이블 없이** Product `metadata` JSON 필드만 사용합니다. 마이그레이션 부담이 적지만, 대규모 참여 시 metadata 배열 크기 관리가 필요합니다.

### 3.3 API 라우트

| Method | 경로 | 구현 파일 | 비고 |
|--------|------|-----------|------|
| GET | `/admin/group-deals` | `api/admin/group-deals/route.ts` | 목록 |
| POST | `/admin/group-deals` | `api/admin/group-deals/route.ts` | 생성 |
| GET | `/admin/group-deals/:id` | `api/admin/group-deals/[id]/route.ts` | 상세 |
| GET | `/store/group-deals` | `api/store/group-deals/route.ts` | 공개 목록 |
| GET | `/store/group-deals/:id` | `api/store/group-deals/[id]/route.ts` | 공개 상세 |
| POST | `/store/group-deals/:id/join` | `api/store/group-deals/[id]/join/route.ts` | 참여 |
| POST | `/store/products/:id/demand-survey/participate` | `api/store/products/[id]/demand-survey/participate/route.ts` | 수요조사 |

**미구현 Admin API:** `PUT/DELETE /admin/group-deals/:id` (README 초기 버전에만 언급, 코드 없음)

### 3.4 Medusa 설정 (`medusa-config.ts`)

- **커스텀 모듈:** `./src/modules/group-buying`
- **Translation 모듈:** `@medusajs/medusa/translation` (feature flag 활성)
- **CORS:** `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` 환경 변수

### 3.5 Admin 접속

- URL: `http://localhost:9000/app`
- 루트 `/`는 API 서버만 응답 → `Cannot GET /` (정상)
- 헬스체크: `http://localhost:9000/health`

---

## 4. 스토어프론트 아키텍처 분석

### 4.1 라우팅 구조

모든 페이지는 `/{countryCode}/` 접두사를 사용합니다. `middleware.ts`가 Medusa regions API로 국가 코드를 결정하고 리다이렉트합니다.

| URL | 페이지 | 핵심 파일 |
|-----|--------|-----------|
| `/kr` | 메인 홈 | `(main)/page.tsx` |
| `/kr/products/[handle]` | 상품 상세 | `(main)/products/[handle]/page.tsx` |
| `/kr/group-buying` | 공동구매 목록 | `(main)/group-buying/page.tsx` |
| `/kr/group-buying/[id]` | 공동구매 상세 | `(main)/group-buying/[id]/page.tsx` |
| `/kr/cart` | 장바구니 | `(main)/cart/page.tsx` |
| `/kr/checkout` | 결제 | `(checkout)/checkout/page.tsx` |

**미들웨어 특이사항 (`middleware.ts`):**

- 백엔드 다운 시 기본 리전(`kr`)으로 fallback (크래시 방지)
- regions fetch 5초 타임아웃
- Edge Runtime에서 Medusa JS SDK 대신 raw `fetch` 사용

### 4.2 데이터 레이어

**패턴:** Next.js Server Actions + `"use server"` 파일

| 파일 | 역할 |
|------|------|
| `lib/data/products.ts` | 상품 목록/상세, `listPublishedProducts()` |
| `lib/data/cart.ts` | 장바구니 CRUD |
| `lib/data/group-deals.ts` | 공동구매 API 래퍼 |
| `lib/data/demand-survey.ts` | 수요조사 참여 API |
| `lib/data/regions.ts` | 리전/국가 코드 |
| `lib/config.ts` | Medusa JS SDK 초기화 |

**캐싱 전략:**

- 개발: `cache: "no-store"` (상품 목록)
- 프로덕션: `force-cache` + Next.js cache tags

### 4.3 다국어 (i18n) 설계

**UI 다국어 (사전 기반):**

```
i18n/dictionaries/{ko,en,es,ru,zh,ja}.ts
  ↓
i18n/server.ts → getServerDictionary() (서버)
i18n/provider.tsx → useDictionary() (클라이언트)
  ↓
layout.tsx에서 I18nProvider로 주입
```

**콘텐츠 다국어 (상품 설명):**

```
lib/util/translate-content.ts
  ├─ 한국어(ko) → 번역 안 함 (원본 표시)
  ├─ 외국어 → MyMemory API (ko|target)
  └─ 실패 시 → 원본 한국어 fallback
```

**상품명 정책:**

- Admin 등록 원본 그대로 표시 (번역 없음)
- `x-medusa-locale` 헤더를 Store API에 보내지 않음 → Medusa Translation이 title을 덮어쓰지 않음

**로케일 저장:**

- 쿠키: `_medusa_locale`
- 지구본 스위처 → `updateLocale()` server action → hard navigation

### 4.4 아이돌 굿즈 UI 컴포넌트

| 컴포넌트 | 파일 | 데이터 소스 |
|----------|------|-------------|
| 제작 타임라인 | `production-timeline/` | `product.metadata.production_stage` |
| 실시간 참여율 | `participation-gauge/` | `participation_current/target` |
| 특전 해금 게이지 | `unlock-reward-gauge/` | 동일 (100/200/300% 마일스톤) |
| 수요조사 패널 | `demand-survey-panel/` | POST participate API |
| 선입금/풀세트 특전 | `bonus-benefit-card/` | 옵션 선택 상태 (클라이언트) |
| 멤버 옵션 카드 | `option-select.tsx` | `product.options` |

**오케스트레이션:** `production-section/index.tsx`가 타임라인·게이지·수요조사 패널을 하나로 묶고, 참여 후 `participation` state를 실시간 갱신합니다.

**Metadata 규약 (`lib/util/idol-product.ts`):**

```typescript
production_stage: "demand_survey" | "pre_deposit" | "general_deposit" | "in_production" | "shipping"
participation_current: number
participation_target: number
participation_participant_ids: string[]  // 수요조사 중복 방지
participation_emails: string[]             // 선택적 이메일 수집
```

한국어 별칭(`수요조사`, `선입금` 등)과 `stage:*` 태그도 파싱을 지원합니다.

---

## 5. 핵심 데이터 흐름

### 5.1 메인 홈 상품 목록

```
사용자 → /kr
  → middleware (countryCode=kr)
  → page.tsx
  → listPublishedProducts()
  → GET /store/products?region_id=...&limit=100
  → PublishedProductsGrid (카드 렌더링)
```

- 컬렉션/카테고리 필터 **없음** — 출판(Published) 상품 전체 표시
- 리전 fallback: kr → DEFAULT_REGION → 첫 번째 리전

### 5.2 상품 상세 + 수요조사

```
사용자 → /kr/products/blackpink
  → listProducts (region_id + calculated_price)
  → translateProductFields (description만 번역)
  → ProductTemplate
       ├─ ProductionSection
       │    ├─ 타임라인 (수요조사 단계 클릭 → 모달)
       │    ├─ 참여율 게이지
       │    └─ 특전 해금 게이지
       ├─ ProductActions (장바구니 담기)
       └─ ProductDescription (마크다운 설명)
```

**수요조사 참여 시퀀스:**

```
1. 사용자가 타임라인 "수요조사" 클릭
2. DemandSurveyPanel 모달 오픈
3. localStorage에서 participant_id 생성/조회
4. POST /store/products/:id/demand-survey/participate
5. joinDemandSurveyWorkflow → metadata.participation_current += 1
6. UI 참여율 게이지 즉시 갱신
```

### 5.3 공동구매 참여

```
사용자 → /kr/group-buying/{dealId}
  → GET /store/group-deals/:id
  → JoinDealForm (email + quantity)
  → POST /store/group-deals/:id/join
  → joinGroupDealWorkflow
       ├─ participant 생성
       ├─ current_quantity 증가
       └─ 목표 달성 시 status=success
```

**현재 한계:** 결제·주문 생성 없음. `order_id`는 항상 null.

### 5.4 장바구니

표준 Medusa v2 패턴:

```
getOrSetCart(countryCode) → region_id 설정
addToCart(variantId) → sdk.store.cart.createLineItem()
cart_id → 쿠키 저장
```

---

## 6. 코드 품질·패턴 평가

### 6.1 잘 된 부분

| 항목 | 설명 |
|------|------|
| 모듈 분리 | 공동구매 = 커스텀 모듈, 수요조사 = metadata 패턴으로 적절히 분리 |
| 워크플로 + 보상 | `joinGroupDealWorkflow`에 compensation(롤백) 구현 |
| i18n 구조 | UI 사전 / 콘텐츠 번역 / 상품명 정책이 명확히 분리 |
| 서버/클라이언트 경계 | RelatedProducts, ProductPreview 등 hydration 이슈 해결 |
| 방어적 미들웨어 | 백엔드 다운 시 fallback으로 스토어프론트 크래시 방지 |
| 환경 변수 분리 | `.env.template` / `.env.production.template` 제공 |

### 6.2 개선이 필요한 부분

| 항목 | 현황 | 권장 조치 |
|------|------|-----------|
| 공동구매 목록 페이지 | `/group-buying`이 상품 그리드만 표시, deal API 미연동 | `listGroupDeals()` + `GroupDealCard` 연결 |
| Admin 공동구매 UI | API만 존재, Admin 대시보드 UI 없음 | Medusa Admin Extension 개발 |
| 공동구매 결제 | 참여 시 주문/결제 없음 | 목표 달성 webhook → 주문 생성 워크플로 |
| 수요조사 저장소 | product.metadata 배열에 participant 누적 | 참여자 많아지면 별도 테이블 분리 |
| 중복 참여 (공동구매) | 이메일 중복 검사 없음 | workflow에 unique 제약 추가 |
| 상품 설명 번역 | MyMemory 무료 API 의존 (할당량 제한) | Medusa Translation 모듈 또는 유료 API |
| 테스트 | unit/integration 테스트 미작성 | workflow·API 핵심 경로 테스트 추가 |
| ts-node 경고 | Windows에서 `path undefined` 경고 반복 | `TS_NODE_PROJECT` 환경 변수 설정 검토 |

### 6.3 보안 고려사항

| 항목 | 상태 |
|------|------|
| `.env` git 제외 | `.gitignore`에 설정됨 |
| JWT/COOKIE 시크릿 | dev 기본값 사용 중 → **배포 시 반드시 변경** |
| 수요조사 participant_id | 클라이언트 생성 UUID — 서버 중복 검사는 있으나 위조 가능 |
| CORS | 환경 변수로 origin 제한 |

---

## 7. 파일·디렉터리 맵 (핵심만)

### Backend (`apps/backend/src/`)

```
api/
├── admin/group-deals/          # Admin 공동구매 CRUD (GET/POST)
└── store/
    ├── group-deals/            # Store 공동구매 + join
    └── products/[id]/demand-survey/participate/  # 수요조사

modules/group-buying/         # 커스텀 모듈 (DB 테이블)
workflows/
├── group-deals.ts            # 생성·참여 워크플로
└── demand-survey.ts          # 수요조사 워크플로

scripts/seed-locales.ts       # 6개국어 로케일 시드
utils/query-group-deals.ts    # Query graph 헬퍼
```

### Storefront (`apps/storefront/src/`)

```
app/[countryCode]/(main)/       # 메인 페이지들
i18n/                           # 다국어 사전·설정
lib/
├── data/                       # Server Actions (API 호출)
└── util/
    ├── idol-product.ts         # 아이돌 메타데이터 파싱
    ├── translate-content.ts    # MyMemory 번역
    └── demand-survey-participant.ts  # localStorage 참여 ID

modules/
├── group-buying/               # 공동구매 UI
├── products/                   # 상품·아이돌 UI
├── layout/                     # Nav, Footer, LanguageSwitcher
├── cart/, checkout/, account/  # 표준 커머스
└── home/                       # Hero 배너
```

---

## 8. 확장 로드맵 제안

### 단기 (1~2주)

1. `/group-buying` 페이지를 `GET /store/group-deals` API와 연결
2. Admin에서 공동구매 생성·관리 UI (또는 간단한 Admin Extension)
3. 공동구매 참여 시 이메일 중복 방지

### 중기 (1~2개월)

4. 목표 달성 시 자동 결제/주문 생성 워크플로
5. 수요조사 참여자 별도 테이블 분리
6. 이메일 알림 (목표 달성, 마감 임박)

### 장기

7. Product ↔ GroupDeal Module Link
8. 실패 시 환불 워크플로
9. Medusa Translation 모듈 기반 상품 설명 번역 (MyMemory 대체)
10. E2E 테스트 (Playwright)

---

## 9. 결론

이 프로젝트는 **Medusa v2의 확장 포인트(Custom Module, Workflow, Store API)** 를 활용해 공동구매 도메인을 구현하고, Next.js 스토어프론트에서 K-POP 굿즈 특화 UI와 6개국어를 더한 **실용적인 MVP** 수준의 코드베이스입니다.

**강점:** 아키텍처 분리가 명확하고, 워크플로 기반 도메인 로직, i18n 정책(상품명 보호 + UI 다국어)이 잘 정의되어 있습니다.

**약점:** 공동구매 목록 UI 미연동, 결제 플로우 미완성, Admin UI 부재, 테스트 부재가 주요 갭입니다.

팀원이 합류할 때는 **README.md의 시작하기**로 환경을 맞춘 뒤, 이 보고서의 **섹션 5 (데이터 흐름)** 와 **섹션 7 (파일 맵)** 을 참고하면 코드베이스를 빠르게 이해할 수 있습니다.

---

*본 문서는 `group-buying-site` 저장소의 현재 코드 상태를 기준으로 작성되었습니다.*
