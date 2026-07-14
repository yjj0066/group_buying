export const SEARCH_QUERY_KEY = "q"
export const CATEGORY_QUERY_KEY = "category_id"

export const parseSearchQuery = (
  searchParams: Record<string, string | string[] | undefined>
): string | undefined => {
  const value = searchParams[SEARCH_QUERY_KEY]

  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  return undefined
}

export const parseCategoryId = (
  searchParams: Record<string, string | string[] | undefined>
): string | undefined => {
  const value = searchParams[CATEGORY_QUERY_KEY]

  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  return undefined
}
