# PokaCatch (포카캐치) — DFD (Data Flow Diagram)

> 발표(PPT)용 자료 · Mermaid flowchart 형식 · 2026-07-23

## 1. 로그인

```mermaid
flowchart LR
    U[사용자] -->|이메일·비밀번호| FE[Next.js<br/>/auth/login<br/>GbAppLoginForm]
    FE -->|Server Action login| SDK[Medusa JS SDK]
    SDK -->|POST /auth/customer/emailpass| BE[Medusa Auth]
    BE -->|인증·세션| DB[(PostgreSQL<br/>customer, auth_identity)]
    DB --> BE
    BE -->|JWT 쿠키 _medusa_jwt| FE
    FE -->|/home 또는 /my| U
```

| 단계 | 역할 |
|------|------|
| **사용자** | 로그인 폼에 이메일·비밀번호 입력 |
| **프론트엔드** | `login()` Server Action → Medusa Auth API 호출, JWT 쿠키 저장 |
| **백엔드** | `emailpass` 프로바이더 인증, 고객 레코드 생성/조회 |
| **데이터베이스** | `customer`, `auth_identity` READ/WRITE |
| **응답** | GB App 홈(`/home`) 또는 마이페이지로 리다이렉트 |

---

## 2. 상품(공구) 조회

```mermaid
flowchart LR
    U[사용자] -->|검색·필터| FE[Next.js<br/>/group-buying]
    FE -->|RSC listGroupDeals| SDK[Medusa JS SDK]
    SDK -->|GET /store/group-deals| BE[group-buying module]
    BE -->|SELECT| DB[(PostgreSQL<br/>group_deal, group_deal_option)]
    SDK -->|GET /store/products| BE2[Product Module]
    BE2 -->|READ| DB2[(product, product_variant)]
    BE --> FE
    BE2 --> FE
    FE -->|SRCH 필터·카드 렌더| U
```

| 단계 | 역할 |
|------|------|
| **사용자** | 공구 목록 접속, 검색어·아이돌 그룹·가격 필터 적용 |
| **프론트엔드** | RSC에서 Store API 호출, 클라이언트 SRCH 필터 |
| **백엔드** | `GroupBuyingModuleService.listGroupDeals()` + 상품 enrichment |
| **데이터베이스** | `group_deal`, `group_deal_option`, `product` READ |
| **응답** | 필터링된 공구 카드 목록 렌더링 |

---

## 3. 공동구매 생성 (총대)

```mermaid
flowchart LR
    U[총대] -->|4단계 위저드 입력| FE[Next.js<br/>/seller/create/*]
    FE -->|createHostedGroupDeal| SDK[Medusa JS SDK]
    SDK -->|POST /store/me/group-deals| BE[createGroupDealWorkflow]
    BE -->|INSERT| DB[(group_deal<br/>group_deal_option)]
    FE -->|recordLeaderDeposit| SDK
    SDK -->|POST .../deposit| BE2[recordLeaderDepositWorkflow]
    BE2 -->|UPDATE deposit_status| DB
    BE2 --> FE
    FE -->|/seller/deals/id| U
```

| 단계 | 역할 |
|------|------|
| **사용자(총대)** | basic → product → sales → deposit 4단계 위저드 완료 |
| **프론트엔드** | `createHostedGroupDeal()`, `recordLeaderDeposit()` Server Action |
| **백엔드** | deal + options INSERT, 보증금 VA stub 발급, `deposit_status=deposited` |
| **데이터베이스** | `group_deal`, `group_deal_option` WRITE |
| **응답** | 총대 대시보드(`/seller/deals/{id}`)로 이동 |

---

## 4. 공동구매 참여

```mermaid
flowchart LR
    U[참여자] -->|멤버·수량·배송지| FE[Next.js<br/>/deals/id/apply]
    FE -->|submitDealApplication| SDK[Medusa JS SDK]
    SDK -->|POST /store/group-deals/:id/apply| BE[prepareGroupDealCheckoutWorkflow]
    BE -->|INSERT participant<br/>+ selections| DB[(group_deal_participant<br/>group_deal_participant_selection<br/>cart)]
    BE -->|VA 5분 기한| FE
    FE -->|/deals/id/deposit| U
```

| 단계 | 역할 |
|------|------|
| **사용자(참여자)** | DETL에서 자리 선택 → APLY에서 배송지 입력 |
| **프론트엔드** | `submitDealApplication()` Server Action |
| **백엔드** | participant + selection INSERT, cart 생성, VA 발급 |
| **데이터베이스** | `group_deal_participant`, `group_deal_participant_selection`, `cart` WRITE |
| **응답** | 입금 안내 화면(`/deposit`)으로 이동 |

---

## 5. 결제

### 5-A. 가상계좌 (v3 기본)

```mermaid
flowchart LR
    U[참여자] -->|입금 확인 클릭| FE[Next.js<br/>/deals/id/deposit]
    FE -->|confirmVirtualAccountDeposit| SDK[Medusa JS SDK]
    SDK -->|POST .../deposit-confirm| BE[GroupBuyingModuleService]
    BE -->|status=confirmed| DB[(group_deal_participant<br/>group_deal)]
    BE --> FE
    FE -->|/deals/id/complete| U
```

### 5-B. PG 결제 (레거시)

```mermaid
flowchart LR
    U2[참여자] -->|checkout| FE2[/checkout]
    FE2 -->|placeOrder| SDK2[Medusa SDK]
    SDK2 --> BE3[group-deal-billing workflow]
    BE3 --> PG[Toss / Stripe]
    PG --> BE3
    BE3 -->|order 생성| DB2[(order, payment_*)]
```

| 단계 | 역할 |
|------|------|
| **사용자** | VA 입금 후 「입금 확인」 (또는 레거시 PG checkout) |
| **프론트엔드** | `confirmVirtualAccountDeposit()` 또는 checkout 위젯 |
| **백엔드** | participant `status` → confirmed, deal metrics 갱신 |
| **데이터베이스** | `group_deal_participant`, `group_deal` UPDATE |
| **응답** | 참여 확정, `/my` 참여 목록 표시 |

> **참고:** CHKO-02 실제 은행 webhook은 미구현(stub). `deposit-confirm`은 수동 확인 경로입니다.
