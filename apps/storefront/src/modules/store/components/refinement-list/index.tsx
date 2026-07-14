"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

import {
  OPTION_VALUE_QUERY_KEY,
  parseOptionValueIds,
} from "@lib/util/product-option-filters"
import ProductSearch from "@modules/layout/components/product-search"
import { HttpTypes } from "@medusajs/types"
import CategoryPicker from "./category-picker"
import OptionsPicker from "./options-picker"
import SortProducts, { SortOptions } from "./sort-products"

type RefinementListProps = {
  sortBy: SortOptions
  search?: boolean
  hideOptionsPicker?: boolean
  categories?: HttpTypes.StoreProductCategory[]
  categoryId?: string
  productOptions?: HttpTypes.StoreProductOption[]
  "data-testid"?: string
}

const RefinementList = ({
  sortBy,
  search = false,
  hideOptionsPicker = false,
  categories = [],
  categoryId = "",
  productOptions = [],
  "data-testid": dataTestId,
}: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateQueryParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      updater(params)

      params.delete("page")

      const queryString = params.toString()
      const currentQuery = searchParams.toString()
      const nextPath = queryString ? `${pathname}?${queryString}` : pathname
      const currentPath = currentQuery
        ? `${pathname}?${currentQuery}`
        : pathname

      if (nextPath !== currentPath) {
        router.push(nextPath)
      }
    },
    [pathname, router, searchParams]
  )

  const setQueryParams = (name: string, value: string) =>
    updateQueryParams((params) => params.set(name, value))

  const deleteQueryParam = (name: string) =>
    updateQueryParams((params) => params.delete(name))

  const selectedOptionValueIds = useMemo(
    () => parseOptionValueIds(searchParams),
    [searchParams]
  )

  const setOptionValueIds = (valueIds: string[]) =>
    updateQueryParams((params) => {
      params.delete(OPTION_VALUE_QUERY_KEY)
      valueIds.forEach((valueId) =>
        params.append(OPTION_VALUE_QUERY_KEY, valueId)
      )
    })

  return (
    <div className="flex flex-col gap-12 py-4 mb-8 small:px-0 pl-6 small:min-w-[250px] small:ml-[1.675rem]">
      {search && <ProductSearch variant="sidebar" className="w-full" />}
      {search && categories.length > 0 && (
        <CategoryPicker
          categories={categories}
          categoryId={categoryId}
          setQueryParams={setQueryParams}
          deleteQueryParam={deleteQueryParam}
        />
      )}
      <SortProducts
        sortBy={sortBy}
        setQueryParams={setQueryParams}
        data-testid={dataTestId}
      />
      {!hideOptionsPicker && productOptions.length > 0 && (
        <OptionsPicker
          options={productOptions}
          selectedValueIds={selectedOptionValueIds}
          setOptionValueIds={setOptionValueIds}
        />
      )}
    </div>
  )
}

export default RefinementList
