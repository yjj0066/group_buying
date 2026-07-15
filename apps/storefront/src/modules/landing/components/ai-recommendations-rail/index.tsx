import { getProductGroupDealIndex } from "@lib/data/group-deals"
import { getRecommendationsViaAiEngine } from "@lib/data/ai-engine"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getServerDictionary } from "@i18n/server"
import { resolveCountryCode } from "@lib/util/country-code"
import ProductPreview from "@modules/products/components/product-preview"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type AiRecommendationsRailProps = {
  countryCode: string
}

const AiRecommendationsRail = async ({
  countryCode,
}: AiRecommendationsRailProps) => {
  const dictionary = await getServerDictionary()
  const normalizedCountry = resolveCountryCode(countryCode)
  const recommendations = await getRecommendationsViaAiEngine({ limit: 4 })

  if (!recommendations?.items?.length) {
    return null
  }

  const productIds = recommendations.items
    .map((item) => item.medusa_product_id)
    .filter(Boolean)

  if (!productIds.length) {
    return null
  }

  const region = await getRegion(normalizedCountry)

  if (!region) {
    return null
  }

  const { response } = await listProducts({
    countryCode: normalizedCountry,
    queryParams: {
      id: productIds,
      limit: productIds.length,
    },
  })

  if (!response.products.length) {
    return null
  }

  const orderMap = new Map(productIds.map((id, index) => [id, index]))
  const orderedProducts = [...response.products].sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
  )

  const productGroupDealIndex = await getProductGroupDealIndex()

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 small:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-neutral-900">
            {dictionary.landing.aiRecommendationsTitle}
          </h2>
          {recommendations.policy && (
            <p className="mt-1 text-sm text-neutral-500">
              {recommendations.policy}
            </p>
          )}
        </div>
        <LocalizedClientLink
          href="/store"
          className="text-sm font-semibold text-brand-pink hover:text-brand-purple"
        >
          {dictionary.landing.viewAllProducts} →
        </LocalizedClientLink>
      </div>
      <ul className="grid grid-cols-2 gap-6 medium:grid-cols-4">
        {orderedProducts.map((product) => (
          <li key={product.id}>
            <ProductPreview
              product={product}
              region={region}
              groupDealId={productGroupDealIndex.get(product.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default AiRecommendationsRail
