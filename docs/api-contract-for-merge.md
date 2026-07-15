# API Contract — Hybrid API (Partner ↔ Practice)

## Partner → Practice (Storefront / BFF 호출)

### Health

```
GET {AI_ENGINE_URL}/api/v1/health
→ { "status": "ok", "service": "group-buying-ai-engine" }
```

### Search

```
GET {AI_ENGINE_URL}/api/v1/products/search?q={query}&customer_id={optional}
→ {
  "query": "bts album",
  "model": "hybrid_search_v1",
  "results": [
    { "medusa_product_id": "prod_01...", "title": "...", "score": 0.92 }
  ]
}
```

Storefront BFF:

- `GET /api/ai/search?q=...`

동작:

1. Flask 응답의 `medusa_product_id` 목록으로 Medusa 상품 조회
2. 실패 시 Medusa `q` 파라미터 검색으로 fallback

### Recommendations

```
GET {AI_ENGINE_URL}/api/v1/customer/recommendations?limit=8&customer_id={optional}
→ {
  "policy": "hybrid_heuristic_v2",
  "items": [
    { "medusa_product_id": "prod_01...", "score": 0.85, "reason": "category_affinity" }
  ]
}
```

Storefront BFF:

- `GET /api/ai/recommendations?limit=8`

노출 위치:

- Landing `AiRecommendationsRail`
- (추후) product detail related, account dashboard

### Search click log (non-blocking)

```
POST {AI_ENGINE_URL}/api/v1/products/search/click
{
  "query": "bts",
  "medusa_product_id": "prod_01...",
  "position": 1,
  "customer_id": null
}
```

## Practice → Partner (Index sync)

```
GET {MEDUSA_URL}/store/products/search-index?limit=200&offset=0
Headers: x-publishable-api-key: {key}
→ {
  "products": [
    {
      "medusa_product_id": "prod_01...",
      "title": "...",
      "description": "...",
      "handle": "...",
      "category_names": ["Album"],
      "idol_group": "BTS",
      "goods_type": "album",
      "price_amount": 28000,
      "currency_code": "krw"
    }
  ],
  "count": 42,
  "offset": 0,
  "limit": 200
}
```

## Environment Variables

### Storefront (`apps/storefront/.env.local`)

```env
AI_ENGINE_URL=http://localhost:5000
# AI_ENGINE_ENABLED=false  # 비활성화 시 Medusa만 사용
```

### Practice Flask

```env
MEDUSA_STORE_URL=http://localhost:9000
MEDUSA_PUBLISHABLE_KEY=pk_...
```

## 발표 전 범위 / 제외

| 포함 | 제외 (발표 후) |
| --- | --- |
| Hybrid search fallback | Payout Medusa 이식 |
| AI recommendations rail | Payment state machine 이식 |
| Search index feed | Full Supabase Auth mapping |
| Mock/API data 분리 | Medusa custom search module |
