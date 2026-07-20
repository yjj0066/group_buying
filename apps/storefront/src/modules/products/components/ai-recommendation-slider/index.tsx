"use client"

import { useEffect, useState } from "react"

import { useDictionary } from "@i18n/provider"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductPreview from "@modules/products/components/product-preview"
import { HttpTypes } from "@medusajs/types"
import type { AiRecommendationContext } from "types/ai-engine"

type RecommendationApiResponse = {
  policy?: string | null
  products: HttpTypes.StoreProduct[]
  group_deal_ids: Record<string, string>
  region: HttpTypes.StoreRegion | null
}

type AiRecommendationSliderProps = {
  context: AiRecommendationContext
  countryCode: string
  productId?: string
  customerId?: string | null
  favoriteIdolGroup?: string | null
  title: string
  subtitle?: string
  viewAllHref?: string
  viewAllLabel?: string
  limit?: number
  className?: string
}

const AiRecommendationSlider = ({
  context,
  countryCode,
  productId,
  customerId = null,
  favoriteIdolGroup = null,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
  limit = context === "landing" ? 12 : 8,
  className = "",
}: AiRecommendationSliderProps) => {
  const t = useDictionary()
  const [state, setState] = useState<
    "loading" | "ready" | "empty" | "error"
  >("loading")
  const [payload, setPayload] = useState<RecommendationApiResponse | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const loadRecommendations = async () => {
      setState("loading")

      const params = new URLSearchParams({
        context,
        country_code: countryCode,
        limit: String(limit),
        hydrate: "true",
      })

      if (productId) {
        params.set("product_id", productId)
      }

      if (customerId) {
        params.set("customer_id", customerId)
      }

      if (favoriteIdolGroup?.trim()) {
        params.set("favorite_idol_group", favoriteIdolGroup.trim())
      }

      try {
        const response = await fetch(
          `/api/ai/recommendations?${params.toString()}`,
          { signal: controller.signal, cache: "no-store" }
        )

        if (!response.ok) {
          setState("error")
          return
        }

        const data = (await response.json()) as RecommendationApiResponse

        if (!data.products?.length || !data.region) {
          setState("empty")
          return
        }

        setPayload(data)
        setState("ready")
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        setState("error")
      }
    }

    void loadRecommendations()

    return () => controller.abort()
  }, [context, countryCode, limit, productId, customerId, favoriteIdolGroup])

  if (state === "empty" || state === "error") {
    return null
  }

  return (
    <section
      className={className}
      data-testid={`ai-recommendation-slider-${context}`}
      aria-busy={state === "loading"}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-black text-neutral-900">{title}</h2>
          {(subtitle || payload?.policy) && (
            <p className="mt-1 text-sm text-neutral-500">
              {subtitle}
              {subtitle && payload?.policy ? " · " : null}
              {payload?.policy ? payload.policy : null}
            </p>
          )}
        </div>
        {viewAllHref && viewAllLabel && state === "ready" && (
          <LocalizedClientLink
            href={viewAllHref}
            className="text-sm font-semibold text-brand-pink hover:text-brand-purple"
          >
            {viewAllLabel} →
          </LocalizedClientLink>
        )}
      </div>

      {state === "loading" ? (
        <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="w-[calc(50%-12px)] shrink-0 xsmall:w-[200px] small:w-[220px] medium:w-[240px]"
            >
              <div className="aspect-[4/5] animate-pulse rounded-lg bg-neutral-100" />
              <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-neutral-100" />
              <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : payload?.region ? (
        <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory">
          {payload.products.map((product) => (
            <div
              key={product.id}
              className="w-[calc(50%-12px)] shrink-0 snap-start xsmall:w-[200px] small:w-[220px] medium:w-[240px]"
            >
              <ProductPreview
                product={product}
                region={payload.region!}
                groupDealId={payload.group_deal_ids[product.id]}
              />
            </div>
          ))}
        </div>
      ) : null}

      {state === "ready" && (
        <p className="mt-3 text-[11px] text-neutral-400">
          {t.products.aiRecommendationsPoweredBy}
        </p>
      )}
    </section>
  )
}

export default AiRecommendationSlider
