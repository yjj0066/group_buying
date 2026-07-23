# PokaCatch (포카캐치) — ERD (Entity Relationship Diagram)

> 발표(PPT)용 자료 · Mermaid `erDiagram` 형식 · 2026-07-23

## ERD 다이어그램

```mermaid
erDiagram
    CUSTOMER ||--o{ GROUP_DEAL : "총대(leader_customer_id)"
    CUSTOMER ||--o{ GROUP_DEAL_PARTICIPANT : "참여(customer_id)"
    CUSTOMER ||--o{ GROUP_DEAL_WAITLIST_ENTRY : "대기(customer_id)"

    PRODUCT ||--o{ GROUP_DEAL : "연결(product_id)"
    PRODUCT_VARIANT ||--o{ GROUP_DEAL : "연결(variant_id)"

    GROUP_DEAL ||--|{ GROUP_DEAL_OPTION : "1:N FK"
    GROUP_DEAL ||--|{ GROUP_DEAL_PARTICIPANT : "1:N FK"
    GROUP_DEAL ||--|{ GROUP_DEAL_WAITLIST_ENTRY : "1:N FK"

    GROUP_DEAL_PARTICIPANT ||--|{ GROUP_DEAL_PARTICIPANT_SELECTION : "1:N FK"
    GROUP_DEAL_OPTION ||--|{ GROUP_DEAL_PARTICIPANT_SELECTION : "1:N FK"

    GROUP_DEAL_PARTICIPANT }o--o| CART : "연결(cart_id)"
    GROUP_DEAL_PARTICIPANT }o--o| ORDER : "연결(order_id)"
    GROUP_DEAL_WAITLIST_ENTRY }o--o| GROUP_DEAL_PARTICIPANT : "매칭(matched_participant_id)"

    CUSTOMER {
        text id PK "cus_*"
        text email
        json metadata "환불계좌 등"
    }

    PRODUCT {
        text id PK "prod_*"
        text title
    }

    PRODUCT_VARIANT {
        text id PK "variant_*"
        text product_id FK
    }

    GROUP_DEAL {
        text id PK "gdeal_*"
        text product_id "논리 FK"
        text variant_id "논리 FK"
        text leader_customer_id "논리 FK"
        number min_participants
        number target_quantity
        enum status "draft~settled"
        enum deposit_status "보증금"
        enum purchase_receipt_status "영수증"
        datetime starts_at
        datetime ends_at
    }

    GROUP_DEAL_OPTION {
        text id PK "gopt_*"
        text group_deal_id FK
        text option_key "멤버/버전 키"
        text label "표시명"
        number target_quantity
        number current_quantity
    }

    GROUP_DEAL_PARTICIPANT {
        text id PK "gpart_*"
        text group_deal_id FK
        text customer_id "논리 FK"
        text email
        enum status "pending~captured"
        text cart_id "논리 FK"
        text order_id "논리 FK"
        text waitlist_entry_id "논리 FK"
        datetime payment_deadline
        text tracking_number
    }

    GROUP_DEAL_PARTICIPANT_SELECTION {
        text id PK "gpsel_*"
        text participant_id FK
        text option_id FK
        number quantity
        numeric unit_price
    }

    GROUP_DEAL_WAITLIST_ENTRY {
        text id PK "gwlist_*"
        text group_deal_id FK
        text customer_id "논리 FK"
        number queue_position
        enum status "waiting~matched"
        text matched_participant_id "논리 FK"
    }

    CART {
        text id PK "cart_*"
    }

    ORDER {
        text id PK "order_*"
    }
```

## 테이블 설명

| 테이블 | 설명 |
|--------|------|
| **group_deal** | 공동구매 본체. 가격·목표 수량·기간·총대·보증금·영수증/송장 AI 상태·공구 상태 관리 |
| **group_deal_option** | 멤버/버전별 선택 옵션. 옵션별 목표·현재 수량·단가 관리 |
| **group_deal_participant** | 참여자. 결제 상태·가상계좌 기한·송장·1차/2차 결제 금액 |
| **group_deal_participant_selection** | **N:M 중간 테이블** — 참여자 ↔ 옵션 간 수량 선택 |
| **group_deal_waitlist_entry** | 공석 발생 시 자동 매칭용 대기자 큐 |

## 관계 설명

| 관계 | 카디널리티 | FK 유형 | 설명 |
|------|:---------:|---------|------|
| group_deal → option / participant / waitlist | **1:N** | DB FK | `ON DELETE CASCADE` |
| participant ↔ option (via selection) | **N:M** | DB FK | selection 테이블로 연결 |
| group_deal → product / customer(총대) | **N:1** | 논리 ID | Medusa 코어 참조 (DB FK 없음) |
| participant → cart / order | **N:1** | 논리 ID | 결제 경로별 (VA / PG) |

## DB FK 제약 (마이그레이션 기준)

| 자식 테이블 | FK 컬럼 | 부모 |
|-------------|---------|------|
| group_deal_option | group_deal_id | group_deal |
| group_deal_participant | group_deal_id | group_deal |
| group_deal_participant_selection | participant_id | group_deal_participant |
| group_deal_participant_selection | option_id | group_deal_option |
| group_deal_waitlist_entry | group_deal_id | group_deal |
