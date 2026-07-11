"use client"

import { Text } from "@modules/common/components/ui"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

export default function ProductPreview({
  product,
  isFeatured,
  region: _region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({
    product,
  })

  if (!product.handle) {
    return null
  }

  const content = (
    <div data-testid="product-wrapper">
      <Thumbnail
        thumbnail={product.thumbnail}
        images={product.images}
        size="full"
        isFeatured={isFeatured}
      />
      <div className="flex txt-compact-medium mt-4 justify-between gap-x-3">
        <Text className="text-ui-fg-subtle group-hover:text-ui-fg-base transition-colors duration-200 line-clamp-2">
          {product.title}
        </Text>
        <div className="flex items-center gap-x-2 shrink-0">
          {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
        </div>
      </div>
    </div>
  )

  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className="group block rounded-lg transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-border-interactive"
      scroll
    >
      {content}
    </LocalizedClientLink>
  )
}
