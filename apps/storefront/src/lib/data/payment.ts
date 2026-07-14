"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { getAuthHeaders, getCacheOptions, getCacheTag } from "./cookies"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"

export const confirmPaymentSessionData = async (input: {
  paymentCollectionId: string
  paymentSessionId: string
  data: Record<string, unknown>
}) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client
    .fetch<{ payment_session: HttpTypes.StorePaymentSession }>(
      `/store/payment-collections/${input.paymentCollectionId}/payment-sessions/${input.paymentSessionId}`,
      {
        method: "POST",
        headers,
        body: {
          data: input.data,
        },
      }
    )
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
    })
    .catch(medusaError)
}

export const listCartPaymentMethods = async (regionId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("payment_providers")),
  }

  return sdk.client
    .fetch<HttpTypes.StorePaymentProviderListResponse>(
      `/store/payment-providers`,
      {
        method: "GET",
        query: { region_id: regionId },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ payment_providers }) =>
      payment_providers.sort((a, b) => {
        return a.id > b.id ? 1 : -1
      })
    )
    .catch(() => {
      return null
    })
}
