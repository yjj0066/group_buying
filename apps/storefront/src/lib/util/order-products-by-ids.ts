import { HttpTypes } from "@medusajs/types"

export const orderProductsByIds = (
  products: HttpTypes.StoreProduct[],
  ids: string[]
): HttpTypes.StoreProduct[] => {
  if (!ids.length) {
    return products
  }

  const byId = new Map(products.map((product) => [product.id, product]))

  return ids
    .map((id) => byId.get(id))
    .filter((product): product is HttpTypes.StoreProduct => Boolean(product))
}
