import React, { Suspense } from "react"

import ProductImageGallery from "@modules/products/components/product-image-gallery"
import ProductionSection from "@modules/products/components/production-section"
import ProductActions from "@modules/products/components/product-actions"
import ProductDescription from "@modules/products/components/product-description"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  return (
    <>
      <div
        className="content-container py-8 small:py-12"
        data-testid="product-container"
      >
        <div className="grid grid-cols-1 items-start gap-10 large:grid-cols-2 large:gap-14">
          <ProductImageGallery images={images} title={product.title} />

          <aside className="flex flex-col">
            <Suspense
              fallback={
                <ProductActions
                  disabled={true}
                  product={product}
                  region={region}
                />
              }
            >
              <ProductActionsWrapper id={product.id} region={region} />
            </Suspense>
          </aside>
        </div>

        <section className="mt-14 flex flex-col gap-10">
          <ProductionSection product={product} />

          <div className="rounded-2xl border border-neutral-100 bg-white px-2 shadow-[0_4px_24px_rgba(0,0,0,0.04)] small:px-4">
            <ProductTabs product={product} />
          </div>

          <ProductDescription content={product.description} />
        </section>
      </div>

      <div
        className="content-container my-16 small:my-32"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate
