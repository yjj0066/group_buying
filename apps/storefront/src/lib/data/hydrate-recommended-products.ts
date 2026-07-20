"use server"

import { getProductGroupDealIndex } from "@lib/data/group-deals"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { orderProductsByIds } from "@lib/util/order-products-by-ids"
import { resolveCountryCode } from "@lib/util/country-code"
import { HttpTypes } from "@medusajs/types"

const PRODUCT_FIELDS =
  "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+thumbnail,+images,+metadata,+tags,"

export type HydratedRecommendationPayload = {
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion | null
  groupDealIds: Record<string, string>
  policy?: string
}

export const hydrateRecommendedProducts = async (input: {
  productIds: string[]
  countryCode: string
  excludeProductId?: string
}): Promise<HydratedRecommendationPayload> => {
  const normalizedCountry = resolveCountryCode(input.countryCode)
  const productIds = input.productIds.filter(
    (id) => id && id !== input.excludeProductId
  )

  if (!productIds.length) {
    return {
      products: [],
      region: null,
      groupDealIds: {},
    }
  }

  const region = await getRegion(normalizedCountry)

  if (!region) {
    return {
      products: [],
      region: null,
      groupDealIds: {},
    }
  }

  const { response } = await listProducts({
    countryCode: normalizedCountry,
    queryParams: {
      id: productIds,
      limit: productIds.length,
      fields: PRODUCT_FIELDS,
    },
  })

  const products = orderProductsByIds(response.products, productIds)
  const groupDealIndex = await getProductGroupDealIndex()
  const groupDealIds = Object.fromEntries(
    products
      .map((product) => {
        const dealId = groupDealIndex.get(product.id)
        return dealId ? [product.id, dealId] : null
      })
      .filter((entry): entry is [string, string] => Boolean(entry))
  )

  return {
    products,
    region,
    groupDealIds,
  }
}
