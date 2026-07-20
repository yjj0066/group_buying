import { getProductGroupDealIndex } from "@lib/data/group-deals"
import { searchProducts } from "@lib/data/flask-search"
import { isFlaskSearchEnabled } from "@lib/config/flask-search"
import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getServerDictionary } from "@i18n/server"
import { OptionValueIds } from "@lib/util/product-option-filters"
import { orderProductsByIds } from "@lib/util/order-products-by-ids"
import ProductPreview from "@modules/products/components/product-preview"
import FlaskSearchMeta from "@modules/store/components/flask-search-meta"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import type { FlaskSynonymExpansion } from "types/flask-search"

const PRODUCT_LIMIT = 12

type PaginatedProductsParams = {
  limit: number
  q?: string
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
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

  let flaskSearchMeta: {
    model?: string
    semanticEngine?: string
    synonymExpansion?: FlaskSynonymExpansion
  } | null = null
  let orderedProductIds: string[] | undefined
  let useMedusaQuery = false

  if (query?.trim()) {
    const normalizedQuery = query.trim()

    if (isFlaskSearchEnabled()) {
      const flaskResult = await searchProducts(normalizedQuery)

      if (flaskResult) {
        flaskSearchMeta = {
          model: flaskResult.model,
          semanticEngine: flaskResult.semanticEngine,
          synonymExpansion: flaskResult.synonymExpansion,
        }
        orderedProductIds = flaskResult.productIds

        if (flaskResult.productIds.length) {
          queryParams.id = flaskResult.productIds
        }
      } else {
        useMedusaQuery = true
      }
    } else {
      useMedusaQuery = true
    }

    if (useMedusaQuery) {
      queryParams.q = normalizedQuery
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
    orderedProductIds = productsIds
  }

  if (sortBy === "created_at") {
    queryParams["order"] = "created_at"
  }

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const productGroupDealIndex = await getProductGroupDealIndex()

  if (query?.trim() && orderedProductIds && !orderedProductIds.length && !useMedusaQuery) {
    return (
      <>
        {flaskSearchMeta && (
          <FlaskSearchMeta dictionary={dictionary} {...flaskSearchMeta} />
        )}
        <p
          className="txt-medium text-ui-fg-subtle py-12"
          data-testid="products-empty-message"
        >
          {dictionary.products.noSearchResults}
        </p>
      </>
    )
  }

  const {
    response: { products: fetchedProducts, count },
  } = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
    countryCode,
    optionValueIds,
  })

  const products =
    orderedProductIds?.length && query?.trim()
      ? orderProductsByIds(fetchedProducts, orderedProductIds)
      : fetchedProducts

  const totalPages = Math.ceil(count / PRODUCT_LIMIT)

  if (products.length === 0) {
    return (
      <>
        {flaskSearchMeta && (
          <FlaskSearchMeta dictionary={dictionary} {...flaskSearchMeta} />
        )}
        <p
          className="txt-medium text-ui-fg-subtle py-12"
          data-testid="products-empty-message"
        >
          {dictionary.products.noSearchResults}
        </p>
      </>
    )
  }

  return (
    <>
      {flaskSearchMeta && (
        <FlaskSearchMeta dictionary={dictionary} {...flaskSearchMeta} />
      )}
      <ul
        className="grid grid-cols-2 w-full small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8"
        data-testid="products-list"
      >
        {products.map((p, index) => {
          return (
            <li key={p.id}>
              <ProductPreview
                product={p}
                region={region}
                groupDealId={productGroupDealIndex.get(p.id)}
                searchTracking={
                  query?.trim()
                    ? {
                        query: query.trim(),
                        position: index + 1,
                      }
                    : undefined
                }
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
