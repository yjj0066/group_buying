"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheTag, getCartId, setCartId } from "@lib/data/cookies"
import { revalidateTag } from "next/cache"
import {
  GroupDealResponse,
  GroupDealsResponse,
  JoinGroupDealResponse,
} from "types/group-deal"

export async function listGroupDeals() {
  try {
    return await sdk.client.fetch<GroupDealsResponse>("/store/group-deals", {
      method: "GET",
      next: { tags: ["group-deals"] },
    })
  } catch {
    return { group_deals: [] }
  }
}

export async function retrieveGroupDeal(id: string) {
  return sdk.client.fetch<GroupDealResponse>(`/store/group-deals/${id}`, {
    method: "GET",
    next: { tags: [`group-deal-${id}`] },
  })
}

export async function startGroupDealCheckout(
  id: string,
  data: {
    email: string
    quantity: number
    countryCode: string
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
