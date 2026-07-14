"use client"

import FilterRadioGroup from "@modules/common/components/filter-radio-group"
import { useDictionary } from "@i18n/provider"
import { useMemo } from "react"

export type SortOptions = "price_asc" | "price_desc" | "created_at"

type SortProductsProps = {
  sortBy: SortOptions
  setQueryParams: (name: string, value: string) => void
  "data-testid"?: string
}

const sortOptionKeys = [
  { value: "created_at", labelKey: "sortLatest" as const },
  { value: "price_asc", labelKey: "sortPriceAsc" as const },
  { value: "price_desc", labelKey: "sortPriceDesc" as const },
]

const SortProducts = ({
  "data-testid": dataTestId,
  sortBy,
  setQueryParams,
}: SortProductsProps) => {
  const t = useDictionary()

  const sortOptions = useMemo(
    () =>
      sortOptionKeys.map((option) => ({
        value: option.value,
        label: t.products[option.labelKey],
      })),
    [t]
  )

  const handleChange = (value: string) => {
    setQueryParams("sortBy", value as SortOptions)
  }

  return (
    <FilterRadioGroup
      title={t.products.sortBy}
      items={sortOptions}
      value={sortBy}
      handleChange={handleChange}
      data-testid={dataTestId}
    />
  )
}

export default SortProducts
