import { listPublishedProducts } from "@lib/data/products"
import { getRegion, retrieveRegion } from "@lib/data/regions"
import { normalizeCountryCode } from "@lib/util/country-code"
import { Heading, Text } from "@modules/common/components/ui"
import ProductPreview from "@modules/products/components/product-preview"
import { HttpTypes } from "@medusajs/types"

type PublishedProductsGridProps = {
  countryCode: string
  regionId?: string
  title?: string
  description?: string
  emptyMessage?: string
  regionErrorMessage?: string
}

const PublishedProductsGrid = async ({
  countryCode,
  regionId,
  title = "Products",
  description,
  emptyMessage = "No products found.",
  regionErrorMessage = "Could not load region data.",
}: PublishedProductsGridProps) => {
  const normalizedCountryCode = normalizeCountryCode(countryCode)

  const { products, region } = await listPublishedProducts({
    countryCode: normalizedCountryCode,
    regionId,
    limit: 100,
  })

  let activeRegion = region

  if (!activeRegion && regionId) {
    try {
      activeRegion = await retrieveRegion(regionId)
    } catch {
      activeRegion = null
    }
  }

  if (!activeRegion) {
    activeRegion = await getRegion(normalizedCountryCode)
  }

  return (
    <div className="content-container py-12">
      <div className="flex flex-col gap-y-4 mb-10">
        <Heading level="h1" className="text-2xl font-semibold">
          {title}
        </Heading>
        {description && (
          <Text className="text-ui-fg-subtle max-w-xl">{description}</Text>
        )}
      </div>

      {!activeRegion ? (
        <div className="py-16 text-center border border-ui-border-base rounded-lg bg-ui-bg-subtle">
          <Text className="text-ui-fg-subtle">{regionErrorMessage}</Text>
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center border border-ui-border-base rounded-lg bg-ui-bg-subtle">
          <Text className="text-ui-fg-subtle">{emptyMessage}</Text>
        </div>
      ) : (
        <ul className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-12">
          {products.map((product) => (
            <li key={product.id}>
              <ProductPreview
                product={product}
                region={activeRegion as HttpTypes.StoreRegion}
                isFeatured
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default PublishedProductsGrid
