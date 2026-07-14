# Group Buying Site — 코드 분석 보고서

> 작성 기준: `group-buying-site` 모노레포 (Medusa v2.17.2 + Next.js 15.5.18)  
> 최종 갱신: 공동구매 결제 연동, 통화 선택, 장바구니·결제 i18n 반영  
> 대상 독자: 프로젝트에 합류하는 개발자, 기획·운영 담당자

---

## 1. 프로젝트 개요

### 1.1 목적

K-POP 아이돌 굿즈를 대상으로 한 **공동구매 + 수요조사** 커머스 플랫폼입니다. Medusa v2를 백엔드로, Next.js를 스토어프론트로 사용하며, 다음 요구사항을 반영했습니다.

- 목표 인원 달성 시 할인가 적용 (공동구매)
- **결제 완료 후 참여 확정** (v2 — 장바구니 → 체크아웃 → 주문)
- 제작 전 수요조사 단계에서 관심 표시 수집
- 제작 진행 상태 시각화 (5단계 타임라인)
- 글로벌 팬 대상 6개국어 UI (장바구니·결제 포함)
- **통화 선택** — 언어와 독립적으로 KRW/USD 등 리전 전환
- 상품명(고유명사)은 원본 유지, UI·설명만 다국어

### 1.2 시스템 구성

```
┌─────────────────────────────────────────────────────────────┐
│                    고객 브라우저                              │
│              http://localhost:8000/kr                       │
│  - 언어: _medusa_locale 쿠키 (6개 UI 로케일)                  │
│  - 통화: /{countryCode}/ URL → Medusa Region               │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Next.js 15 Storefront (apps/storefront)         │
│  - App Router, Server Actions, i18n Provider                 │
│  - CurrencySelect / LanguageSwitcher                         │
│  - Medusa JS SDK → Store API 호출                            │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (REST)
┌──────────────────────────▼──────────────────────────────────┐
│              Medusa v2 Backend (apps/backend)                │
│  - Custom Group Buying Module                                │
│  - Payment-integrated join workflows                         │
│  - order.placed subscriber → 참여 확정                       │
│  - Demand Survey Workflow (Product Metadata)                 │
│  - Translation Module (상품명은 스토어프론트에서 우회)         │
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
| 결제 | Stripe / 수동 결제 | 8.x | 체크아웃 결제 |
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
| `service.ts` | `MedusaService` CRUD + 지표 재계산·참여 검증 |
| `models/index.ts` | `GroupDeal`, `GroupDealParticipant` 엔티티 정의 |
| `migrations/Migration20250710120000.ts` | 초기 테이블 생성 |
| `migrations/Migration20250713160000.ts` | v2 필드·상태 마이그레이션 |

**GroupDeal 엔티티 주요 필드:**

| 필드 | 설명 |
|------|------|
| `product_id`, `variant_id` | 연결 상품 (텍스트 ID, Module Link 미사용) |
| `min_participants` | 최소 참여 인원 (고유 결제 고객) |
| `current_participants` | 확정된 고유 참여 인원 |
| `target_quantity` | 목표 수량 (특전 게이지용) |
| `current_quantity` | 확정된 총 수량 |
| `max_quantity` | 최대 판매 수량 (null = 무제한) |
| `original_price`, `deal_price`, `currency_code` | 가격 정보 |
| `status` | `draft \| open \| minimum_reached \| closed \| failed \| cancelled` |
| `starts_at`, `ends_at` | 캠페인 기간 |

**GroupDealParticipant 엔티티:**

| 필드 | 설명 |
|------|------|
| `email`, `customer_id` | 참여자 식별 |
| `quantity` | 참여 수량 |
| `status` | `pending \| confirmed \| cancelled` |
| `cart_id` | 결제 준비 시 생성된 장바구니 |
| `order_id` | 결제 완료 후 연결된 주문 |

### 3.2 상태 머신 (`utils/group-deal-rules.ts`)

**딜 상태 전이:**

```
draft → open → minimum_reached → closed
              ↘ failed
              ↘ cancelled
```

| 상태 | 의미 |
|------|------|
| `open` | 참여 가능 (레거시 `active` 정규화) |
| `minimum_reached` | `current_participants >= min_participants` |
| `closed` | 수량 소진 또는 기간 종료 |
| `failed` | 기한 내 최소 인원 미달 |
| `cancelled` | 수동 취소 |

**참여 가능 조건:** `open` 또는 `minimum_reached` + `starts_at`~`ends_at` 내 + 수량 한도 미초과

**핵심 함수:**

- `assertDealJoinable` — 참여 전 검증
- `evaluateDealStatus` — 지표 기반 상태 갱신
- `countUniqueConfirmedParticipants` — 고유 결제 고객 수
- `sumConfirmedQuantity` — 확정 수량 합계
- `buildParticipantKey` — customer_id 또는 email 기반 중복 식별

단위 테스트: `apps/backend/src/utils/__tests__/group-deal-rules.spec.ts`

### 3.3 워크플로 (Workflows)

**`workflows/group-deals.ts`**

```
createGroupDealWorkflow
  └─ createGroupDealStep → group_deal INSERT

prepareGroupDealCheckoutWorkflow          ← v2 핵심
  └─ 참여 검증 (assertDealJoinable)
  └─ participant 생성/갱신 (status: pending)
  └─ deal_price로 cart + line item 생성
  └─ line item metadata: group_deal_id, participant_id, is_group_deal

confirmGroupDealParticipationWorkflow     ← 결제 후 확정
  └─ order.placed 이벤트에서 호출
  └─ participant → confirmed
  └─ 중복 참여자 병합 (customer_id / email)
  └─ recalculateDealMetrics → 상태·지표 갱신
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

수요조사는 **별도 DB 테이블 없이** Product `metadata` JSON 필드만 사용합니다.

### 3.4 서브스크라이버

**`subscribers/order-placed-group-deal.ts`**

- 이벤트: `OrderWorkflowEvents.PLACED`
- 동작: `confirmGroupDealParticipationWorkflow` 실행
- 장바구니 line item의 `group_deal_id` 메타데이터로 딜·참여자 연결

### 3.5 API 라우트

| Method | 경로 | 구현 파일 | 비고 |
|--------|------|-----------|------|
| GET | `/admin/group-deals` | `api/admin/group-deals/route.ts` | 목록 |
| POST | `/admin/group-deals` | `api/admin/group-deals/route.ts` | 생성 |
| GET | `/admin/group-deals/:id` | `api/admin/group-deals/[id]/route.ts` | 상세 |
| GET | `/store/group-deals` | `api/store/group-deals/route.ts` | 참여 가능 딜만 |
| GET | `/store/group-deals/:id` | `api/store/group-deals/[id]/route.ts` | 공개 상세 |
| POST | `/store/group-deals/:id/join` | `api/store/group-deals/[id]/join/route.ts` | 참여 → cart_id 반환 |
| POST | `/store/products/:id/demand-survey/participate` | `api/store/products/[id]/demand-survey/participate/route.ts` | 수요조사 |

**Join API 응답:**

```json
{
  "cart_id": "cart_...",
  "participant": { ... },
  "group_deal": { ... },
  "checkout_path": "/checkout"
}
```

**미구현 Admin API:** `PUT/DELETE /admin/group-deals/:id`

### 3.6 시드 스크립트

| 스크립트 | 실행 | 역할 |
|----------|------|------|
| `migration-scripts/initial-data-seed.ts` | `pnpm db:migrate` 시 자동 | 리전, 상품, 재고, API 키 |
| `scripts/seed-locales.ts` | `pnpm seed:locales` | 6개 UI 로케일 |
| `scripts/seed-currency-regions.ts` | `pnpm seed:regions` | Korea/America 리전, KRW 가격 |

### 3.7 Medusa 설정 (`medusa-config.ts`)

- **커스텀 모듈:** `./src/modules/group-buying`
- **Translation 모듈:** `@medusajs/medusa/translation` (feature flag 활성)
- **CORS:** `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` 환경 변수
- **개발 시 린트:** `medusa develop` 시작 전 ESLint 자동 실행

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

- 백엔드 다운 시 기본 리전(`kr`)으로 fallback
- regions fetch 5초 타임아웃
- Edge Runtime에서 raw `fetch` 사용

### 4.2 언어 vs 통화 (독립 설계)

| 축 | 저장 위치 | 영향 범위 |
|----|-----------|-----------|
| **언어** | `_medusa_locale` 쿠키 | UI 문자열 (i18n 사전) |
| **통화/가격** | URL `/{countryCode}/` | Medusa Region, cart.region_id, 가격 표시 |

**CurrencySelect** (`modules/layout/components/currency-select/`)

- Medusa regions에서 통화 목록 추출 (`lib/util/currency-options.ts`)
- 선택 시 `updateRegion(countryCode)` → cart region 갱신 + URL 리다이렉트

**LanguageSwitcher** (`modules/layout/components/language-switcher/`)

- `updateLocale()` server action → 쿠키 갱신 → hard navigation
- 가격·리전에는 영향 없음

### 4.3 다국어 (i18n) 설계

**UI 다국어 (사전 기반):**

```
i18n/dictionaries/{ko,en,es,ru,zh,ja}.ts
  ↓
i18n/server.ts → getServerDictionary() (서버)
i18n/provider.tsx → useDictionary() (클라이언트)
  ↓
(main)/layout.tsx, (checkout)/layout.tsx 에서 I18nProvider 주입
```

**i18n 적용 범위 (v2 확장):**

| 영역 | 주요 키 |
|------|---------|
| 네비게이션 | `nav.*` |
| 장바구니 | `cart.*` (title, summary, goToCheckout, totals 등) |
| 결제 | `checkout.*` (shippingAddress, payment, placeOrder 등) |
| 결제 수단명 | `checkout.paymentProviders.*` |
| 공동구매 | `groupBuying.*` |

**결제 수단명 로컬라이제이션:**

- `lib/constants.tsx` → `getPaymentInfoMap(paymentProviders)`
- `payment/index.tsx`에서 `useDictionary()` + `useMemo`로 동적 생성

**콘텐츠 다국어 (상품 설명):**

```
lib/util/translate-content.ts
  ├─ 한국어(ko) → 번역 안 함
  ├─ 외국어 → MyMemory API
  └─ 실패 시 → 원본 fallback
```

**상품명 정책:**

- Admin 등록 원본 그대로 표시
- `get-locale-header.ts`가 `x-medusa-locale` 미전송 → Medusa Translation이 title 덮어쓰기 방지

### 4.4 데이터 레이어

| 파일 | 역할 |
|------|------|
| `lib/data/products.ts` | 상품 목록/상세 |
| `lib/data/cart.ts` | 장바구니 CRUD, `updateRegion()` |
| `lib/data/group-deals.ts` | `startGroupDealCheckout()` — join → checkout 리다이렉트 |
| `lib/data/demand-survey.ts` | 수요조사 참여 API |
| `lib/data/regions.ts` | 리전/국가 코드 |
| `lib/data/locale.ts` | 로케일 쿠키 읽기/쓰기 |
| `lib/config.ts` | Medusa JS SDK 초기화 |

### 4.5 아이돌 굿즈 UI 컴포넌트

| 컴포넌트 | 파일 | 데이터 소스 |
|----------|------|-------------|
| 제작 타임라인 | `production-timeline/` | `product.metadata.production_stage` |
| 실시간 참여율 | `participation-gauge/` | `participation_current/target` |
| 특전 해금 게이지 | `unlock-reward-gauge/` | quantity 마일스톤 |
| 수요조사 패널 | `demand-survey-panel/` | POST participate API |
| 공동구매 진행률 | `group-deal-progress/` | `current_participants / min_participants` |

**Metadata 규약 (`lib/util/idol-product.ts`):**

```typescript
production_stage: "demand_survey" | "pre_deposit" | "general_deposit" | "in_production" | "shipping"
participation_current: number
participation_target: number
participation_participant_ids: string[]
```

---

## 5. 핵심 데이터 흐름

### 5.1 공동구매 참여 (결제 연동 — v2)

```
사용자 → /kr/group-buying/{dealId}
  → GET /store/group-deals/:id
  → JoinDealForm (email + quantity)
  → startGroupDealCheckout() [Server Action]
  → POST /store/group-deals/:id/join
  → prepareGroupDealCheckoutWorkflow
       ├─ assertDealJoinable (상태·기간·수량)
       ├─ participant 생성 (pending)
       └─ deal_price 장바구니 + line item 생성
  → /kr/checkout 리다이렉트
  → 배송지 → 배송 → 결제 → 주문 확인
  → order.placed 이벤트
  → confirmGroupDealParticipationWorkflow
       ├─ participant → confirmed
       ├─ 중복 참여 병합
       └─ recalculateDealMetrics (participants, quantity, status)
```

**v1과의 차이:**

| | v1 (이전) | v2 (현재) |
|---|----------|----------|
| 참여 시 | 이메일·수량만 기록 | 장바구니 생성 |
| 확정 시점 | 즉시 quantity 증가 | 결제 완료 후 |
| order_id | 항상 null | 주문 연결 |
| 참여율 기준 | quantity 합계 | 고유 결제 고객 수 |

### 5.2 수요조사 참여

```
1. 타임라인 "수요조사" 클릭 → DemandSurveyPanel 모달
2. localStorage participant_id 생성/조회
3. POST /store/products/:id/demand-survey/participate
4. metadata.participation_current += 1
5. UI 참여율 게이지 즉시 갱신
```

공동구매 DB와 **완전 분리** — metadata + localStorage 기반.

### 5.3 장바구니·결제 (i18n 포함)

```
/kr/cart
  → (main)/layout.tsx → I18nProvider
  → ItemsTemplate, Summary, CartTotals (useDictionary)
  → generateMetadata() → 언어별 페이지 타이틀

/kr/checkout
  → (checkout)/layout.tsx → I18nProvider + CheckoutNav
  → Addresses → Shipping → Payment → Review
  → PaymentButton → placeOrder()
```

### 5.4 통화 전환

```
CurrencySelect → updateRegion("us")
  → cart.region_id 갱신
  → redirect /us{currentPath}
  → 가격이 USD 리전 기준으로 재계산
```

---

## 6. 코드 품질·패턴 평가

### 6.1 잘 된 부분

| 항목 | 설명 |
|------|------|
| 도메인 분리 | 공동구매(DB) vs 수요조사(metadata) 역할 분리 |
| 결제 연동 | 워크플로 + subscriber로 참여 확정 시점 명확 |
| 상태 머신 | `group-deal-rules.ts`에 규칙 집중 + 단위 테스트 |
| i18n 구조 | UI 사전 / 콘텐츠 번역 / 상품명 정책 분리 |
| 언어·통화 독립 | 쿠키 vs URL로 관심사 분리 |
| 방어적 미들웨어 | 백엔드 다운 시 fallback |
| Medusa 규칙 준수 | 서비스 public 메서드 async, develop 시 린트 |

### 6.2 개선이 필요한 부분

| 항목 | 현황 | 권장 조치 |
|------|------|-----------|
| 공동구매 목록 페이지 | `/group-buying`이 상품 그리드만 표시 | `listGroupDeals()` API 연동 |
| Admin 공동구매 UI | API만 존재 | Admin Extension 개발 |
| Admin 수정·삭제 API | 미구현 | PUT/DELETE 라우트 추가 |
| 수요조사 저장소 | metadata 배열 누적 | 대규모 시 별도 테이블 |
| 상품 설명 번역 | MyMemory 무료 API | Medusa Translation 또는 유료 API |
| 실패·환불 | `failed` 상태만 존재 | 환불 워크플로 추가 |
| E2E 테스트 | 없음 | Playwright로 join→checkout 경로 |

### 6.3 보안 고려사항

| 항목 | 상태 |
|------|------|
| `.env` git 제외 | `.gitignore` 설정됨 |
| JWT/COOKIE 시크릿 | dev 기본값 → **배포 시 변경 필수** |
| 수요조사 participant_id | 클라이언트 UUID — 위조 가능 |
| CORS | 환경 변수로 origin 제한 |

---

## 7. 파일·디렉터리 맵 (핵심만)

### Backend (`apps/backend/src/`)

```
api/
├── admin/group-deals/              # Admin CRUD (GET/POST)
└── store/
    ├── group-deals/                # Store + join (cart 생성)
    └── products/[id]/demand-survey/participate/

modules/group-buying/
├── models/index.ts
├── service.ts                    # recalculateDealMetrics, validateJoinRequest
└── migrations/

workflows/
├── group-deals.ts                # prepare/confirm checkout workflows
└── demand-survey.ts

subscribers/
└── order-placed-group-deal.ts    # 결제 완료 → 참여 확정

utils/
├── group-deal-rules.ts           # 상태 머신
├── resolve-region.ts
└── __tests__/group-deal-rules.spec.ts

scripts/
├── seed-locales.ts
└── seed-currency-regions.ts

migration-scripts/
└── initial-data-seed.ts
```

### Storefront (`apps/storefront/src/`)

```
app/[countryCode]/
├── (main)/                       # cart, group-buying, products
└── (checkout)/                   # checkout + I18nProvider layout

i18n/
├── dictionaries/{ko,en,es,ru,zh,ja}.ts
├── types.ts                      # cart.*, checkout.* 키 정의
├── provider.tsx
└── server.ts

lib/
├── constants.tsx                 # getPaymentInfoMap()
├── data/group-deals.ts           # startGroupDealCheckout()
└── util/
    ├── currency-options.ts
    ├── idol-product.ts
    └── translate-content.ts

modules/
├── group-buying/                 # join-deal-form, group-deal-progress
├── cart/                         # i18n 적용
├── checkout/                     # i18n 적용 + checkout-nav
├── layout/
│   └── components/
│       ├── currency-select/
│       └── language-switcher/
└── products/                     # 아이돌 굿즈 UI
```

---

## 8. 확장 로드맵 제안

### 단기 (1~2주)

1. `/group-buying` 페이지를 `GET /store/group-deals` API와 연결
2. Admin 공동구매 생성·관리 UI
3. Admin PUT/DELETE API

### 중기 (1~2개월)

4. `failed` 딜 자동 환불 워크플로
5. 수요조사 참여자 별도 테이블
6. 이메일 알림 (목표 달성, 마감 임박)

### 장기

7. Product ↔ GroupDeal Module Link
8. Medusa Translation 기반 상품 설명 번역 (MyMemory 대체)
9. E2E 테스트 (Playwright)

---

## 9. 결론

이 프로젝트는 Medusa v2 확장 포인트(Custom Module, Workflow, Subscriber, Store API)로 **결제 연동 공동구매**를 구현하고, Next.js 스토어프론트에서 K-POP 굿즈 UI, 6개국어, 통화 선택을 더한 실용적인 MVP입니다.

**강점:** 결제 후 참여 확정 흐름, 상태 머신 규칙 집중, 언어·통화 독립 설계, 장바구니·결제 i18n, 상품명 보호 정책.

**약점:** 공동구매 목록 UI 미연동, Admin UI 부재, 환불·E2E 테스트 미구현.

팀원 합류 시 **README.md 시작하기**로 환경을 맞춘 뒤, 이 보고서 **섹션 5 (데이터 흐름)** 과 **섹션 7 (파일 맵)** 을 참고하면 빠르게 이해할 수 있습니다.

---

*본 문서는 `group-buying-site` 저장소의 현재 코드 상태를 기준으로 작성되었습니다.*
