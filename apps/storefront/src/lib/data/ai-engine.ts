"use server"

import {
  getAiEngineBaseUrl,
  isAiEngineEnabled,
} from "@lib/config/ai-engine"
import type {
  AiEngineHealth,
  AiRecommendationsResponse,
  AiSearchResponse,
  HybridSearchResult,
} from "types/ai-engine"

const REQUEST_TIMEOUT_MS = 2500

const fetchWithTimeout = async (
  url: string,
  init?: RequestInit
): Promise<Response> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export const checkAiEngineHealth = async (): Promise<AiEngineHealth> => {
  const baseUrl = getAiEngineBaseUrl()

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
  if (!isAiEngineEnabled() || !query.trim()) {
    return null
  }

  const baseUrl = getAiEngineBaseUrl()

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

    const body = (await response.json()) as AiSearchResponse
    const productIds = (body.results ?? [])
      .map((item) => item.medusa_product_id)
      .filter(Boolean)

    if (!productIds.length) {
      return null
    }

    return {
      productIds,
      source: "ai",
      model: body.model,
    }
  } catch (error) {
    console.warn("[ai-engine] search fallback to Medusa:", error)
    return null
  }
}

export const getRecommendationsViaAiEngine = async (options?: {
  customerId?: string | null
  limit?: number
}): Promise<AiRecommendationsResponse | null> => {
  if (!isAiEngineEnabled()) {
    return null
  }

  const baseUrl = getAiEngineBaseUrl()

  if (!baseUrl) {
    return null
  }

  const params = new URLSearchParams({
    limit: String(options?.limit ?? 8),
  })

  if (options?.customerId) {
    params.set("customer_id", options.customerId)
  }

  try {
    const response = await fetchWithTimeout(
      `${baseUrl}/api/v1/customer/recommendations?${params.toString()}`,
      { cache: "no-store" }
    )

    if (!response.ok) {
      return null
    }

    return (await response.json()) as AiRecommendationsResponse
  } catch (error) {
    console.warn("[ai-engine] recommendations unavailable:", error)
    return null
  }
}

export const logSearchClickViaAiEngine = async (payload: {
  query: string
  medusa_product_id: string
  position?: number
  customer_id?: string | null
}): Promise<void> => {
  if (!isAiEngineEnabled()) {
    return
  }

  const baseUrl = getAiEngineBaseUrl()

  if (!baseUrl) {
    return
  }

  try {
    await fetchWithTimeout(`${baseUrl}/api/v1/products/search/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch {
    // Non-blocking analytics — swallow errors per Hybrid API rules
  }
}
