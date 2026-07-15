# Domain Contract — Partner Medusa + Practice Flask (Hybrid API)

> 기준일: 2026-07-15  
> 기준 시스템: **Partner** Next.js + Medusa (commerce) / **Practice** Flask (AI search & recommendations)

## Source of Truth

| 도메인 | Owner | 저장소 |
| --- | --- | --- |
| Product, Cart, Order, Payment | Medusa PostgreSQL | Partner backend |
| GroupDeal, Participant, Waitlist | Medusa custom module | Partner backend |
| SearchDocument, Embedding, SearchLog | Flask PostgreSQL | Practice backend |
| Customer identity (발표 후) | Supabase Auth → Medusa customer mapping | Hybrid |

## Entity Mapping

| Practice | Partner | 비고 |
| --- | --- | --- |
| `Product` | Medusa `Product` | `medusa_product_id` = Medusa product id |
| `GroupPurchaseCampaign` | `GroupDeal` | Partner 모델 우선 |
| `GroupPurchaseParticipant` | `GroupDealParticipant` | Partner 모델 우선 |
| `Cart` / `Order` / `Payment` | Medusa 기본 | Practice 모델 사용 금지 (transaction 충돌 방지) |
| `SearchDocument` | 없음 | Flask 전용 |
| `Payout*` | `settleGroupDealWorkflow` | 발표 이후 이식 |

## Hybrid API Rules

1. Flask는 **검색·추천·로그**만 담당한다.
2. 결제, 주문 생성, 재고 차감, 공구 참여 확정은 Medusa만 수행한다.
3. Flask 장애 시 storefront는 Medusa 기본 검색으로 **자동 fallback**한다.
4. Mock landing 데이터와 API 데이터는 `dataSource: api | mock`으로 구분한다.

## Product Sync Key

Flask 인덱스는 반드시 `medusa_product_id`를 foreign key로 사용한다.

Partner feed endpoint:

- `GET /store/products/search-index`

Practice crawler는 이 endpoint로 published 상품을 주기적으로 동기화한다.
