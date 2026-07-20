"use server"

import {
  getFlaskSearchApiUrl,
  getFlaskRequestTimeoutMs,
  isFlaskSearchEnabled,
} from "@lib/config/flask-search"
import { logSearchClick, searchProducts } from "@lib/data/flask-search"
import type {
  AiEngineHealth,
  AiRecommendationsResponse,
  HybridSearchResult,
} from "types/ai-engine"

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

export const checkAiEngineHealth = async (): Promise<AiEngineHealth> => {
  const baseUrl = getFlaskSearchApiUrl()

  if (!baseUrl) {
    return { ok: false }
  }

  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/v1/health`)

    if (!response.ok) {
      return { ok: false }
    }

    const body = (await response.json()) as { status?: string; service?: string }

    return {
      ok: body.status === "ok" || response.ok,
      service: body.service,
    }
  } catch {
    return { ok: false }
  }
}

export const searchProductsViaAiEngine = async (
  query: string,
  options?: { customerId?: string | null }
): Promise<HybridSearchResult | null> => {
  const result = await searchProducts(query, options)

  if (!result) {
    return null
  }

  return {
    ...result,
    source: "ai",
  }
}

export const getRecommendationsViaAiEngine = async (options?: {
  customerId?: string | null
  limit?: number
  context?: import("types/ai-engine").AiRecommendationContext
  productId?: string
  favoriteIdolGroup?: string | null
}): Promise<AiRecommendationsResponse | null> => {
  if (!isFlaskSearchEnabled()) {
    return null
  }

  const baseUrl = getFlaskSearchApiUrl()

  if (!baseUrl) {
    return null
  }

  const params = new URLSearchParams({
    limit: String(options?.limit ?? 8),
  })

  if (options?.customerId) {
    params.set("customer_id", options.customerId)
  }

  if (options?.context) {
    params.set("context", options.context)
  }

  if (options?.context === "landing") {
    params.set("policy", "deadline_popularity")
  }

  if (options?.favoriteIdolGroup?.trim()) {
    params.set("favorite_idol_group", options.favoriteIdolGroup.trim())
  }

  if (options?.productId) {
    params.set("medusa_product_id", options.productId)
  }

  const recommendationUrl =
    options?.context === "similar" && options.productId
      ? `${baseUrl}/api/v1/products/similar?${params.toString()}`
      : `${baseUrl}/api/v1/customer/recommendations?${params.toString()}`

  try {
    const response = await fetchWithTimeout(recommendationUrl, {
      cache: "no-store",
    })

    if (!response.ok) {
      if (options?.context === "similar" && options.productId) {
        const fallbackParams = new URLSearchParams(params)
        fallbackParams.set("context", "similar")

        const fallbackResponse = await fetchWithTimeout(
          `${baseUrl}/api/v1/customer/recommendations?${fallbackParams.toString()}`,
          { cache: "no-store" }
        )

        if (!fallbackResponse.ok) {
          return null
        }

        return (await fallbackResponse.json()) as AiRecommendationsResponse
      }

      return null
    }

    return (await response.json()) as AiRecommendationsResponse
  } catch (error) {
    console.warn("[ai-engine] recommendations unavailable:", error)
    return null
  }
}

export const logSearchClickViaAiEngine = logSearchClick
