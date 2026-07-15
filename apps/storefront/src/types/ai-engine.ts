export type AiSearchResultItem = {
  medusa_product_id: string
  title?: string
  score?: number
  handle?: string
}

export type AiSearchResponse = {
  query: string
  model?: string
  results: AiSearchResultItem[]
}

export type AiRecommendationItem = {
  medusa_product_id: string
  title?: string
  score?: number
  reason?: string
}

export type AiRecommendationsResponse = {
  policy?: string
  items: AiRecommendationItem[]
}

export type AiEngineHealth = {
  ok: boolean
  service?: string
}

export type HybridSearchResult = {
  productIds: string[]
  source: "ai" | "medusa"
  model?: string
}
