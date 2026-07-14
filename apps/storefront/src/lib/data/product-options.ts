import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

export const listProductOptions = async (query?: Record<string, unknown>) => {
  const next = {
    ...(await getCacheOptions("product-options")),
  }

  return sdk.client
    .fetch<{ product_options: HttpTypes.StoreProductOption[] }>(
      "/store/product-options",
      {
        query: {
          is_exclusive: false,
          fields: "*values",
          ...query,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_options }) => product_options)
    .catch(() => [] as HttpTypes.StoreProductOption[])
}
