"use client"

import { useDictionary } from "@i18n/provider"

const RelatedProductsHeader = () => {
  const t = useDictionary()

  return (
    <div className="flex flex-col items-center text-center mb-16">
      <span className="text-base-regular text-gray-600 mb-6">
        {t.products.relatedProducts}
      </span>
      <p className="text-2xl-regular text-ui-fg-base max-w-lg">
        {t.products.relatedProductsDescription}
      </p>
    </div>
  )
}

export default RelatedProductsHeader
