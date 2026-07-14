import { Suspense } from "react"

import { listCategories } from "@lib/data/categories"
import { listProductOptions } from "@lib/data/product-options"
import { OptionValueIds } from "@lib/util/product-option-filters"
import {
  translateCategories,
  translateProductOptions,
} from "@lib/util/translate-content"
import { formatMessage, getMedusaLocaleCode, getServerDictionary } from "@i18n/server"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = async ({
  sortBy,
  page,
  countryCode,
  optionValueIds,
  query,
  categoryId,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
  query?: string
  categoryId?: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"
  const dictionary = await getServerDictionary()
  const localeCode = await getMedusaLocaleCode()
  const [categories, productOptions] = await Promise.all([
    translateCategories(await listCategories({ limit: 100 }), localeCode),
    translateProductOptions(await listProductOptions(), localeCode),
  ])

  const selectedCategory = categoryId
    ? categories.find((category) => category.id === categoryId)
    : undefined

  let pageTitle = dictionary.products.allProducts

  if (query) {
    pageTitle = formatMessage(dictionary.products.searchResultsFor, { query })
  } else if (selectedCategory) {
    pageTitle = selectedCategory.name
  }

  return (
    <div
      className="flex flex-col small:flex-row small:items-start py-6 content-container"
      data-testid="category-container"
    >
      <RefinementList
        sortBy={sort}
        search
        categories={categories}
        categoryId={categoryId ?? ""}
        productOptions={productOptions}
      />
      <div className="w-full">
        <div className="mb-8 text-2xl-semi">
          <h1 data-testid="store-page-title">{pageTitle}</h1>
        </div>
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
            optionValueIds={optionValueIds}
            query={query}
            categoryId={categoryId}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
