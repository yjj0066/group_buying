/**
 * [DETL] 공구 상세
 * Wireframe ID: DETL | 도메인: 참여자 | 우선순위: P0
 */
import { notFound, redirect } from "next/navigation"

import { getStoreGroupDeal } from "@lib/data/group-deals"
import { listProducts } from "@lib/data/products"
import { resolveCountryCode } from "@lib/util/country-code"
import {
  enrichGroupDealFromProduct,
  resolveProductHeroImage,
} from "@lib/util/product-group-deal"
import { gbAppRoutes } from "@lib/wireframe/routes"
import DealDetailView from "@modules/group-buying/components/deal-detail-view"
import { isDealSoldOut } from "types/group-deal"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
}

export default async function DealDetailPage(props: Props) {
  const { countryCode, dealId } = await props.params
  let deal = await getStoreGroupDeal(dealId)

  if (!deal) {
    notFound()
  }

  if (isDealSoldOut(deal)) {
    redirect(gbAppRoutes.dealClosed(countryCode, dealId))
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

  return <DealDetailView deal={deal} heroImageUrl={heroImageUrl} />
}
