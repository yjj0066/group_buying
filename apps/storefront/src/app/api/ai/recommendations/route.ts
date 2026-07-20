import { NextRequest, NextResponse } from "next/server"

import { getRecommendationsViaAiEngine } from "@lib/data/ai-engine"
import { hydrateRecommendedProducts } from "@lib/data/hydrate-recommended-products"
import type { AiRecommendationContext } from "types/ai-engine"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = Number(searchParams.get("limit") ?? "8")
  const customerId = searchParams.get("customer_id")
  const countryCode = searchParams.get("country_code") ?? "kr"
  const context = searchParams.get("context") as AiRecommendationContext | null
  const productId = searchParams.get("product_id") ?? undefined
  const favoriteIdolGroup = searchParams.get("favorite_idol_group")
  const hydrate = searchParams.get("hydrate") !== "false"

  const result = await getRecommendationsViaAiEngine({
    customerId,
    limit: Number.isFinite(limit) ? limit : 8,
    context: context ?? undefined,
    productId,
    favoriteIdolGroup,
  })

  if (!result?.items?.length) {
    return NextResponse.json(
      {
        policy: result?.policy ?? null,
        items: [],
        products: [],
        group_deal_ids: {},
        region: null,
      },
      { status: 200 }
    )
  }

  const productIds = result.items
    .map((item) => item.medusa_product_id)
    .filter(Boolean)

  if (!hydrate) {
    return NextResponse.json(result)
  }

  const hydrated = await hydrateRecommendedProducts({
    productIds,
    countryCode,
    excludeProductId: productId,
  })

  return NextResponse.json({
    policy: result.policy,
    items: result.items,
    products: hydrated.products,
    group_deal_ids: hydrated.groupDealIds,
    region: hydrated.region,
  })
}
