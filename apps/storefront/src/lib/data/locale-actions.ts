"use server"

import { sdk } from "@lib/config"
import { setLocaleCookie } from "@lib/data/locale"
import { revalidateTag } from "next/cache"
import { getAuthHeaders, getCacheTag, getCartId } from "./cookies"

/**
 * Updates the locale preference and stores it in a cookie.
 * Cart/cache updates are best-effort so locale switching never blocks navigation.
 */
export const updateLocale = async (localeCode: string): Promise<string> => {
  await setLocaleCookie(localeCode)

  try {
    const cartId = await getCartId()

    if (cartId) {
      const headers = {
        ...(await getAuthHeaders()),
      }

      await sdk.store.cart.update(cartId, { locale: localeCode }, {}, headers)

      const cartCacheTag = await getCacheTag("carts")
      if (cartCacheTag) {
        revalidateTag(cartCacheTag)
      }
    }
  } catch (error) {
    console.error("[locale] Cart locale update skipped:", error)
  }

  const cacheTags = ["products", "categories", "collections"] as const

  for (const tag of cacheTags) {
    try {
      const cacheTag = await getCacheTag(tag)
      if (cacheTag) {
        revalidateTag(cacheTag)
      }
    } catch (error) {
      console.error(`[locale] Cache revalidation skipped for ${tag}:`, error)
    }
  }

  return localeCode
}
