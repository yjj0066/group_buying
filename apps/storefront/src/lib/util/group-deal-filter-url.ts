import type { GroupDealFilterState } from "@lib/util/group-deal-filters"
import { DEFAULT_GROUP_DEAL_FILTERS } from "@lib/util/group-deal-filters"

type SearchParamSource =
  | URLSearchParams
  | Record<string, string | string[] | undefined>

const readParam = (source: SearchParamSource, key: string): string => {
  if (source instanceof URLSearchParams) {
    return source.get(key) ?? ""
  }

  const value = source[key]

  if (Array.isArray(value)) {
    return value[0] ?? ""
  }

  return value ?? ""
}

export const parseFiltersFromSearchParams = (
  source: SearchParamSource,
  base: Partial<GroupDealFilterState> = {}
): GroupDealFilterState => {
  const sort = readParam(source, "sort")
  const minPrice = readParam(source, "minPrice")
  const maxPrice = readParam(source, "maxPrice")

  return {
    ...DEFAULT_GROUP_DEAL_FILTERS,
    ...base,
    query: readParam(source, "q"),
    idolGroup: readParam(source, "group"),
    member: readParam(source, "member"),
    goodsType: readParam(source, "goods"),
    sortBy: sort === "newest" ? "newest" : "deadline",
    minPrice: minPrice ? Number(minPrice) : null,
    maxPrice: maxPrice ? Number(maxPrice) : null,
    favoriteMember: readParam(source, "favorite"),
    vacantOnly: readParam(source, "vacant") === "1",
    urgentOnly: readParam(source, "urgent") === "1",
  }
}

export const filtersToSearchParams = (
  filters: GroupDealFilterState
): URLSearchParams => {
  const params = new URLSearchParams()
  const query = filters.query.trim()

  if (query) {
    params.set("q", query)
  }

  if (filters.idolGroup) {
    params.set("group", filters.idolGroup)
  }

  if (filters.member) {
    params.set("member", filters.member)
  }

  if (filters.goodsType) {
    params.set("goods", filters.goodsType)
  }

  if (filters.sortBy === "newest") {
    params.set("sort", "newest")
  }

  if (filters.minPrice != null) {
    params.set("minPrice", String(filters.minPrice))
  }

  if (filters.maxPrice != null) {
    params.set("maxPrice", String(filters.maxPrice))
  }

  if (filters.favoriteMember) {
    params.set("favorite", filters.favoriteMember)
  }

  if (filters.vacantOnly) {
    params.set("vacant", "1")
  }

  if (filters.urgentOnly) {
    params.set("urgent", "1")
  }

  return params
}

export const buildGroupBuyingSearchPath = (
  countryCode: string,
  query: string
): string => {
  const trimmed = query.trim()

  if (!trimmed) {
    return `/${countryCode}/group-buying`
  }

  const params = new URLSearchParams()
  params.set("q", trimmed)

  return `/${countryCode}/group-buying?${params.toString()}`
}
