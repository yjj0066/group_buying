import { getProductGroupDealIndex } from "@lib/data/group-deals"
import { searchProductsViaAiEngine } from "@lib/data/ai-engine"
import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getServerDictionary } from "@i18n/server"
import { OptionValueIds } from "@lib/util/product-option-filters"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { Text } from "@modules/common/components/ui"
const PRODUCT_LIMIT = 12

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
  q?: string
}

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  productsIds,
  countryCode,
  optionValueIds,
  query,
}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryId?: string
  productsIds?: string[]
  countryCode: string
  optionValueIds?: OptionValueIds
  query?: string
}) {
  const dictionary = await getServerDictionary()
  const queryParams: PaginatedProductsParams = {
    limit: 12,
  }

  let searchSource: "ai" | "medusa" | null = null
  let aiModel: string | undefined

  if (query?.trim()) {
    const aiResult = await searchProductsViaAiEngine(query)

    if (aiResult?.productIds.length) {
      queryParams.id = aiResult.productIds
      searchSource = "ai"
      aiModel = aiResult.model
    } else {
      queryParams.q = query
      searchSource = "medusa"
    }
  }
  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  if (categoryId) {
    queryParams["category_id"] = [categoryId]
  }

  if (productsIds) {
    queryParams["id"] = productsIds
  }

  if (sortBy === "created_at") {
    queryParams["order"] = "created_at"
  }

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const productGroupDealIndex = await getProductGroupDealIndex()

  const {
    response: { products, count },
  } = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
    countryCode,
    optionValueIds,
  })

  const totalPages = Math.ceil(count / PRODUCT_LIMIT)

  if (products.length === 0) {
    return (
      <p
        className="txt-medium text-ui-fg-subtle py-12"
        data-testid="products-empty-message"
      >
        {dictionary.products.noSearchResults}
      </p>
    )
  }

  return (
    <>
      {searchSource === "ai" && (
        <Text className="mb-4 text-xs text-ui-fg-subtle">
          {dictionary.products.aiSearchActive.replace("{model}", aiModel ?? "hybrid")}
        </Text>
      )}
      <ul
        className="grid grid-cols-2 w-full small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8"
        data-testid="products-list"
      >
        {products.map((p) => {
          return (
            <li key={p.id}>
              <ProductPreview
                product={p}
                region={region}
                groupDealId={productGroupDealIndex.get(p.id)}
              />
            </li>
          )
        })}
      </ul>
      {totalPages > 1 && (
        <Pagination
          data-testid="product-pagination"
          page={page}
          totalPages={totalPages}
        />
      )}
    </>
  )
}
