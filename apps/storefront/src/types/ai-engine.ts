export type {
  FlaskSearchResultItem as AiSearchResultItem,
  FlaskSearchResponse as AiSearchResponse,
  FlaskSearchSynonymExpansionRaw as AiSearchSynonymExpansion,
  FlaskSynonymExpansion,
} from "types/flask-search"

export type AiRecommendationItem = {
  medusa_product_id: string
  title?: string
  score?: number
  reason?: string
}

export type AiRecommendationContext = "landing" | "similar"

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
  items: import("types/flask-search").FlaskSearchResultItem[]
  source: "ai" | "flask"
  model?: string
  query: string
  synonymExpansion?: import("types/flask-search").FlaskSynonymExpansion
  semanticEngine?: string
}
