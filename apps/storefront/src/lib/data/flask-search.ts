"use server"

import {
  getFlaskSearchApiUrl,
  getFlaskRequestTimeoutMs,
  isFlaskSearchEnabled,
} from "@lib/config/flask-search"
import type {
  FlaskSearchResponse,
  FlaskSearchResult,
  FlaskSearchResultItem,
  FlaskSynonymExpansion,
} from "types/flask-search"

const fetchWithTimeout = async (
  url: string,
  init?: RequestInit
): Promise<Response> => {
  const controller = new AbortController()
  const timeoutMs = getFlaskRequestTimeoutMs()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

const mergeSearchResults = (body: FlaskSearchResponse): FlaskSearchResultItem[] => {
  const semantic = body.semantic_results ?? []
  const keyword = body.results ?? []
  const seen = new Set<string>()
  const merged: FlaskSearchResultItem[] = []

  for (const item of [...semantic, ...keyword]) {
    const id = item.medusa_product_id

    if (!id || seen.has(id)) {
      continue
    }

    seen.add(id)
    merged.push(item)
  }

  return merged
}

const parseSynonymExpansion = (
  body: FlaskSearchResponse
): FlaskSynonymExpansion | undefined => {
  const expandedTerms = [
    ...(body.synonyms ?? []),
    ...(body.query_expansion ?? []),
    ...(body.synonym_expansion?.expanded ?? []),
  ].filter(Boolean)

  const expandedQuery =
    body.expanded_query?.trim() ||
    body.synonym_expansion?.expanded_query?.trim() ||
    undefined

  if (!expandedTerms.length && !expandedQuery) {
    return undefined
  }

  return {
    originalQuery: body.synonym_expansion?.original?.trim() || body.query,
    expandedTerms: expandedQuery
      ? Array.from(new Set([...expandedTerms, expandedQuery]))
      : Array.from(new Set(expandedTerms)),
    expandedQuery,
  }
}

export const searchProducts = async (
  query: string,
  options?: { customerId?: string | null }
): Promise<FlaskSearchResult | null> => {
  if (!isFlaskSearchEnabled() || !query.trim()) {
    return null
  }

  const baseUrl = getFlaskSearchApiUrl()

  if (!baseUrl) {
    return null
  }

  const params = new URLSearchParams({ q: query.trim() })

  if (options?.customerId) {
    params.set("customer_id", options.customerId)
  }

  try {
    const response = await fetchWithTimeout(
      `${baseUrl}/api/v1/products/search?${params.toString()}`,
      { cache: "no-store" }
    )

    if (!response.ok) {
      return null
    }

    const body = (await response.json()) as FlaskSearchResponse
    const items = mergeSearchResults(body)
    const productIds = items.map((item) => item.medusa_product_id).filter(Boolean)

    return {
      productIds,
      items,
      source: "flask",
      model: body.model,
      query: body.query || query.trim(),
      synonymExpansion: parseSynonymExpansion(body),
      semanticEngine: body.semantic_engine,
    }
  } catch (error) {
    console.warn("[flask-search] search unavailable:", error)
    return null
  }
}

export const logSearchClick = async (payload: {
  query: string
  medusa_product_id: string
  position?: number
  customer_id?: string | null
}): Promise<void> => {
  const { forwardFlaskSearchClick } = await import("@lib/data/flask-behavior-log")

  await forwardFlaskSearchClick({
    query: payload.query,
    medusa_product_id: payload.medusa_product_id,
    position: payload.position,
    customer_id: payload.customer_id ?? null,
  })
}
