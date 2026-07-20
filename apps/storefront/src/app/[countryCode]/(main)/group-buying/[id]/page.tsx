import { Metadata } from "next"
import { notFound } from "next/navigation"

import GroupDealDetailTemplate from "@modules/group-buying/templates/group-deal-detail"
import { retrieveGroupDeal } from "@lib/data/group-deals"
import { listProducts } from "@lib/data/products"
import { resolveCountryCode } from "@lib/util/country-code"
import {
  enrichGroupDealFromProduct,
  resolveProductHeroImage,
} from "@lib/util/product-group-deal"

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const params = await props.params

  try {
    const { group_deal: deal } = await retrieveGroupDeal(params.id)

    return {
      title: deal.title,
      description: deal.description ?? undefined,
    }
  } catch {
    return { title: "Group Deal" }
  }
}

export default async function GroupDealDetailPage(props: {
  params: Promise<{ id: string; countryCode: string }>
}) {
  const params = await props.params

  let groupDeal

  try {
    const response = await retrieveGroupDeal(params.id)
    groupDeal = response.group_deal
  } catch {
    notFound()
  }

  if (!groupDeal) {
    notFound()
  }

  let enrichedDeal = groupDeal
  let heroImageUrl = resolveProductHeroImage(groupDeal)

  if (groupDeal.product_id && !groupDeal.product_id.startsWith("demo-")) {
    try {
      const { response } = await listProducts({
        countryCode: resolveCountryCode(params.countryCode),
        queryParams: {
          id: [groupDeal.product_id],
          fields:
            "+description,+thumbnail,+images,+metadata,*variants.calculated_price",
          limit: 1,
        },
      })
      const product = response.products[0]

      if (product) {
        enrichedDeal = enrichGroupDealFromProduct(groupDeal, product)
        heroImageUrl = resolveProductHeroImage(enrichedDeal, product)
      }
    } catch {
      // optional enrichment
    }
  }

  return (
    <GroupDealDetailTemplate
      groupDeal={enrichedDeal}
      heroImageUrl={heroImageUrl}
      countryCode={params.countryCode}
    />
  )
}
