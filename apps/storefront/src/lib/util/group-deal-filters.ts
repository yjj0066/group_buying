import type { GroupDeal } from "types/group-deal"
import {
  getDaysUntilDeadline,
  getOptionRemainingQuantity,
  hasMemberVacancy,
} from "types/group-deal"
import {
  filterDealsByCatalogTab,
  isCatalogDealClosed,
  type CatalogStatusTab,
} from "@lib/util/group-deal-catalog"
import { isStoreVisibleDeal } from "@lib/util/normalize-group-deal"
import {
  matchesGoodsTypeFilter,
  matchesIdolGroupFilter,
} from "@lib/util/group-buying-filter-match"

export const SEARCH_MIN_LENGTH = 2

export type GroupDealFilterState = {
  query: string
  idolGroup: string
  member: string
  goodsType: string
  sortBy: "deadline" | "newest"
  /** Default in_progress so expired demo deals don't bury joinable ones. */
  catalogTab: CatalogStatusTab
  minPrice: number | null
  maxPrice: number | null
  favoriteMember: string
  vacantOnly: boolean
  urgentOnly: boolean
}

export type GroupDealFilterFacets = {
  idolGroups: string[]
  members: string[]
  goodsTypes: string[]
  minPrice: number
  maxPrice: number
}

export const DEFAULT_GROUP_DEAL_FILTERS: GroupDealFilterState = {
  query: "",
  idolGroup: "",
  member: "",
  goodsType: "",
  sortBy: "deadline",
  catalogTab: "in_progress",
  minPrice: null,
  maxPrice: null,
  favoriteMember: "",
  vacantOnly: false,
  urgentOnly: false,
}

export const extractGroupDealFacets = (
  deals: GroupDeal[]
): GroupDealFilterFacets => {
  const idolGroups = new Set<string>()
  const members = new Set<string>()
  const goodsTypes = new Set<string>()
  let minPrice = Infinity
  let maxPrice = 0

  for (const deal of deals) {
    const group = deal.metadata?.idol_group

    if (typeof group === "string" && group) {
      idolGroups.add(group)
    }

    const goodsType = deal.metadata?.goods_type

    if (typeof goodsType === "string" && goodsType) {
      goodsTypes.add(goodsType)
    }

    for (const option of deal.options ?? []) {
      if (option.option_type === "member") {
        members.add(option.label)
      }
    }

    minPrice = Math.min(minPrice, deal.deal_price)
    maxPrice = Math.max(maxPrice, deal.deal_price)
  }

  return {
    idolGroups: Array.from(idolGroups).sort(),
    members: Array.from(members).sort(),
    goodsTypes: Array.from(goodsTypes).sort(),
    minPrice: Number.isFinite(minPrice) ? minPrice : 0,
    maxPrice: maxPrice || 0,
  }
}

const matchesQuery = (deal: GroupDeal, query: string): boolean => {
  const normalized = query.trim().toLowerCase()

  if (!normalized) {
    return true
  }

  if (normalized.length < SEARCH_MIN_LENGTH) {
    return false
  }

  const haystack = [
    deal.title,
    deal.description ?? "",
    String(deal.metadata?.idol_group ?? ""),
    ...(deal.options ?? []).map((option) => option.label),
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(normalized)
}

export const filterGroupDeals = (
  deals: GroupDeal[],
  filters: GroupDealFilterState
): GroupDeal[] => {
  let result = filterDealsByCatalogTab(deals, filters.catalogTab).filter(
    (deal) => {
    if (!matchesQuery(deal, filters.query)) {
      return false
    }

    if (!matchesIdolGroupFilter(deal.metadata?.idol_group, filters.idolGroup)) {
      return false
    }

    if (
      !matchesGoodsTypeFilter(deal.metadata?.goods_type, filters.goodsType)
    ) {
      return false
    }

    if (filters.member) {
      const hasMember = (deal.options ?? []).some(
        (option) =>
          option.option_type === "member" && option.label === filters.member
      )

      if (!hasMember) {
        return false
      }
    }

    if (filters.minPrice != null && deal.deal_price < filters.minPrice) {
      return false
    }

    if (filters.maxPrice != null && deal.deal_price > filters.maxPrice) {
      return false
    }

    if (filters.urgentOnly && !deal.is_urgent_fill) {
      return false
    }

    if (filters.vacantOnly && filters.favoriteMember) {
      if (!hasMemberVacancy(deal, filters.favoriteMember)) {
        return false
      }
    }

    return true
  }
  )

  if (filters.sortBy === "deadline") {
    // Open deals first — ascending ends_at alone floats expired/closed cards to the top.
    result = [...result].sort((a, b) => {
      const aClosed = isCatalogDealClosed(a) ? 1 : 0
      const bClosed = isCatalogDealClosed(b) ? 1 : 0

      if (aClosed !== bClosed) {
        return aClosed - bClosed
      }

      return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime()
    })
  } else {
    result = [...result].sort((a, b) => {
      const aClosed = isCatalogDealClosed(a) ? 1 : 0
      const bClosed = isCatalogDealClosed(b) ? 1 : 0

      if (aClosed !== bClosed) {
        return aClosed - bClosed
      }

      return (
        new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
      )
    })
  }

  return result
}

export const hasActiveFilters = (filters: GroupDealFilterState): boolean =>
  filters.query.trim() !== "" ||
  filters.idolGroup !== "" ||
  filters.member !== "" ||
  filters.goodsType !== "" ||
  filters.minPrice != null ||
  filters.maxPrice != null ||
  filters.favoriteMember !== "" ||
  filters.vacantOnly ||
  filters.urgentOnly ||
  filters.sortBy !== "deadline" ||
  filters.catalogTab !== "in_progress"

export const filterFavoriteVacancy = (
  deals: GroupDeal[],
  favoriteMember: string
): GroupDeal[] =>
  deals.filter((deal) => hasMemberVacancy(deal, favoriteMember))

export const filterDeadlineSoon = (
  deals: GroupDeal[],
  withinHours = 72
): GroupDeal[] =>
  deals.filter((deal) => {
    const hoursLeft = Math.ceil(
      (new Date(deal.ends_at).getTime() - Date.now()) / (1000 * 60 * 60)
    )
    return hoursLeft >= 0 && hoursLeft <= withinHours
  })

export const filterUrgentVacancy = (deals: GroupDeal[]): GroupDeal[] =>
  deals.filter((deal) => {
    if (!deal.is_urgent_fill) {
      return false
    }

    return (deal.options ?? []).some((option) => {
      if (option.option_type !== "member") {
        return false
      }

      const remaining = getOptionRemainingQuantity(option)
      return remaining == null || remaining > 0
    })
  })

export const filterDepositSecured = (deals: GroupDeal[]): GroupDeal[] =>
  deals.filter(isStoreVisibleDeal)

export const filterStoreVisibleDeals = filterDepositSecured

export const sortByDeadline = (deals: GroupDeal[]): GroupDeal[] =>
  [...deals].sort((a, b) => {
    const aClosed = isCatalogDealClosed(a) ? 1 : 0
    const bClosed = isCatalogDealClosed(b) ? 1 : 0

    if (aClosed !== bClosed) {
      return aClosed - bClosed
    }

    return (
      getDaysUntilDeadline(a) - getDaysUntilDeadline(b) ||
      new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime()
    )
  })

type GroupBuyingPreferences = {
  favorite_idol_group?: string | null
  favorite_member?: string | null
}

export const buildInitialFiltersFromPreferences = (
  preferences: GroupBuyingPreferences | null | undefined,
  patch: Partial<GroupDealFilterState> = {}
): GroupDealFilterState => ({
  ...DEFAULT_GROUP_DEAL_FILTERS,
  favoriteMember: preferences?.favorite_member ?? "",
  idolGroup: preferences?.favorite_idol_group ?? "",
  ...patch,
})
