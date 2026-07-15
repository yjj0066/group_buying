"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheTag, getCartId, setCartId } from "@lib/data/cookies"
import { revalidateTag } from "next/cache"
import {
  GroupDealResponse,
  GroupDealsResponse,
  JoinGroupDealResponse,
  JoinWaitlistResponse,
  isDepositSecured,
} from "types/group-deal"

export async function listGroupDeals(options?: { includePendingDeposit?: boolean }) {
  try {
    const query = options?.includePendingDeposit ? "?navigation=true" : ""
    const response = await sdk.client.fetch<GroupDealsResponse>(
      `/store/group-deals${query}`,
      {
        method: "GET",
        next: { tags: ["group-deals"] },
      }
    )

    const deals = options?.includePendingDeposit
      ? response.group_deals
      : response.group_deals.filter(isDepositSecured)

    return {
      group_deals: deals,
    }
  } catch {
    return { group_deals: [] }
  }
}

export async function retrieveGroupDeal(id: string) {
  try {
    const response = await sdk.client.fetch<GroupDealResponse>(
      `/store/group-deals/${id}`,
      {
        method: "GET",
        next: { tags: [`group-deal-${id}`] },
      }
    )

    if (!response?.group_deal) {
      throw new Error(`Group deal with id: ${id} was not found`)
    }

    return response
  } catch (error) {
    const { getMockLandingDealById, mapLandingCardToGroupDeal } =
      await import("@lib/util/landing-deals")
    const mock = getMockLandingDealById(id)

    if (mock) {
      return { group_deal: mapLandingCardToGroupDeal(mock) }
    }

    throw error
  }
}

export async function startGroupDealCheckout(
  id: string,
  data: {
    email: string
    quantity: number
    countryCode: string
    selections?: Array<{ option_id: string; quantity: number }>
  }
) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const existingCartId = await getCartId()

  const response = await sdk.client.fetch<JoinGroupDealResponse>(
    `/store/group-deals/${id}/join`,
    {
      method: "POST",
      body: {
        email: data.email,
        quantity: data.quantity,
        country_code: data.countryCode,
        cart_id: existingCartId,
        selections: data.selections,
      },
      headers,
    }
  )

  await setCartId(response.cart_id)

  const cartCacheTag = await getCacheTag("carts")
  if (cartCacheTag) {
    revalidateTag(cartCacheTag)
  }

  return response
}

export async function joinGroupDealWaitlist(
  id: string,
  data: {
    email: string
    quantity?: number
    selections?: Array<{ option_id: string; quantity: number }>
  }
) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client.fetch<JoinWaitlistResponse>(
    `/store/group-deals/${id}/waitlist`,
    {
      method: "POST",
      body: {
        email: data.email,
        quantity: data.quantity,
        selections: data.selections,
      },
      headers,
    }
  )
}

export async function getProductGroupDealIndex() {
  const { group_deals: deals } = await listGroupDeals({
    includePendingDeposit: true,
  })
  const index = new Map<string, string>()

  for (const deal of deals) {
    if (deal.product_id) {
      index.set(deal.product_id, deal.id)
    }
  }

  return index
}

export async function findGroupDealByProductId(productId: string) {
  try {
    const response = await sdk.client.fetch<GroupDealResponse>(
      `/store/group-deals/by-product/${productId}`,
      {
        method: "GET",
        next: { tags: [`product-group-deal-${productId}`] },
      }
    )

    return response.group_deal
  } catch {
    const { group_deals: deals } = await listGroupDeals({
      includePendingDeposit: true,
    })

    return deals.find((deal) => deal.product_id === productId) ?? null
  }
}
