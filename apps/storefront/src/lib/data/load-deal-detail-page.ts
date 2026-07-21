import { getStoreGroupDeal } from "@lib/data/group-deals"
import { listProducts } from "@lib/data/products"
import { resolveCountryCode } from "@lib/util/country-code"
import {
  enrichGroupDealFromProduct,
  resolveProductHeroImage,
} from "@lib/util/product-group-deal"
import type { GroupDeal } from "types/group-deal"

export type DealDetailPageData = {
  deal: GroupDeal
  heroImageUrl: string | null
}

export async function loadDealDetailPageData(
  countryCode: string,
  dealId: string
): Promise<DealDetailPageData | null> {
  let deal = await getStoreGroupDeal(dealId)

  if (!deal) {
    return null
  }

  let heroImageUrl = resolveProductHeroImage(deal)

  if (deal.product_id && !deal.product_id.startsWith("demo-")) {
    try {
      const { response } = await listProducts({
        countryCode: resolveCountryCode(countryCode),
        queryParams: {
          id: [deal.product_id],
          fields:
            "+description,+thumbnail,+images,+metadata,*variants.calculated_price",
          limit: 1,
        },
      })
      const product = response.products[0]

      if (product) {
        deal = enrichGroupDealFromProduct(deal, product)
        heroImageUrl = resolveProductHeroImage(deal, product)
      }
    } catch {
      // optional enrichment
    }
  }

  return { deal, heroImageUrl }
}
