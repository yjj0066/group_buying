export type FlaskSearchResultItem = {
  medusa_product_id: string
  title?: string
  score?: number
  handle?: string
  thumbnail?: string | null
  rank?: number
}

export type FlaskSearchSynonymExpansionRaw = {
  original?: string
  expanded?: string[]
  expanded_query?: string
}

export type FlaskSearchResponse = {
  query: string
  model?: string
  expanded_query?: string
  synonyms?: string[]
  query_expansion?: string[]
  synonym_expansion?: FlaskSearchSynonymExpansionRaw
  semantic_engine?: string
  semantic_results?: FlaskSearchResultItem[]
  results: FlaskSearchResultItem[]
}

export type FlaskSynonymExpansion = {
  originalQuery: string
  expandedTerms: string[]
  expandedQuery?: string
}

export type FlaskSearchResult = {
  productIds: string[]
  items: FlaskSearchResultItem[]
  source: "flask"
  model?: string
  query: string
  synonymExpansion?: FlaskSynonymExpansion
  semanticEngine?: string
}
