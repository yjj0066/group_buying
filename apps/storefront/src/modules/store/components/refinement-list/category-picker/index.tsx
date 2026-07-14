"use client"

import FilterRadioGroup from "@modules/common/components/filter-radio-group"
import { useDictionary } from "@i18n/provider"
import { CATEGORY_QUERY_KEY } from "@lib/util/product-filters"
import { HttpTypes } from "@medusajs/types"

type CategoryPickerProps = {
  categories: HttpTypes.StoreProductCategory[]
  categoryId?: string
  setQueryParams: (name: string, value: string) => void
  deleteQueryParam: (name: string) => void
}

const CategoryPicker = ({
  categories,
  categoryId = "",
  setQueryParams,
  deleteQueryParam,
}: CategoryPickerProps) => {
  const t = useDictionary()

  const topLevelCategories = categories.filter(
    (category) => !category.parent_category
  )

  const items = [
    {
      value: "",
      label: t.products.allCategories,
    },
    ...topLevelCategories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ]

  const handleChange = (value: string) => {
    if (value) {
      setQueryParams(CATEGORY_QUERY_KEY, value)
    } else {
      deleteQueryParam(CATEGORY_QUERY_KEY)
    }
  }

  if (topLevelCategories.length === 0) {
    return null
  }

  return (
    <FilterRadioGroup
      title={t.products.categoryFilter}
      items={items}
      value={categoryId}
      handleChange={handleChange}
      data-testid="category-filter"
    />
  )
}

export default CategoryPicker
