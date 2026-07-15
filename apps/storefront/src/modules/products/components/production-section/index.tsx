"use client"

import { HttpTypes } from "@medusajs/types"
import ProductionTimeline from "@modules/products/components/production-timeline"

type ProductionSectionProps = {
  product: HttpTypes.StoreProduct
}

const ProductionSection = ({ product }: ProductionSectionProps) => {
  return <ProductionTimeline product={product} />
}

export default ProductionSection
