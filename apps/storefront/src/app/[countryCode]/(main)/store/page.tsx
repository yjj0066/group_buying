import { getServerDictionary } from "@i18n/server"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import {
  parseCategoryId,
  parseSearchQuery,
} from "@lib/util/product-filters"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"

export async function generateMetadata() {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.products.allProducts,
    description: dictionary.products.homeDescription,
  }
}

type StorePageSearchParams = Record<string, string | string[] | undefined> & {
  sortBy?: SortOptions
  page?: string
  optionValueIds?: string | string[]
  q?: string
  category_id?: string
}

type Params = {
  searchParams: Promise<StorePageSearchParams>
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)
  const query = parseSearchQuery(searchParams)
  const categoryId = parseCategoryId(searchParams)

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
      query={query}
      categoryId={categoryId}
    />
  )
}
