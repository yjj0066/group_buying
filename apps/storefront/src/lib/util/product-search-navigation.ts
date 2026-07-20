import { SEARCH_QUERY_KEY } from "@lib/util/product-filters"

export const buildStoreSearchPath = (
  countryCode: string,
  query: string,
  existingParams?: URLSearchParams | string
): string => {
  const nextParams = new URLSearchParams(
    typeof existingParams === "string"
      ? existingParams
      : existingParams?.toString() ?? ""
  )
  const trimmed = query.trim()

  if (trimmed) {
    nextParams.set(SEARCH_QUERY_KEY, trimmed)
  } else {
    nextParams.delete(SEARCH_QUERY_KEY)
  }

  nextParams.delete("page")

  const queryString = nextParams.toString()

  return `/${countryCode}/store${queryString ? `?${queryString}` : ""}`
}
