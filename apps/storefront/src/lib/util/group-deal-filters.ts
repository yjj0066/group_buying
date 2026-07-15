import type { GroupDeal, GroupDealOption } from "types/group-deal"
import {
  getParticipationRate,
  hasMemberVacancy,
  isDealSoldOut,
  isDepositSecured,
} from "types/group-deal"

export type GroupDealFilterState = {
  query: string
  idolGroup: string
  member: string
  goodsType: string
  minPrice: number | null
  maxPrice: number | null
  favoriteMember: string
  vacantOnly: boolean
  sortBy: "deadline" | "newest"
}

export const DEFAULT_GROUP_DEAL_FILTERS: GroupDealFilterState = {
  query: "",
  idolGroup: "",
  member: "",
  goodsType: "",
  minPrice: null,
  maxPrice: null,
  favoriteMember: "",
  vacantOnly: false,
  sortBy: "deadline",
}

export const SEARCH_MIN_LENGTH = 2

export type GroupDealFilterFacets = {
  idolGroups: string[]
  members: string[]
  goodsTypes: string[]
  minPrice: number
  maxPrice: number
}

export const extractGroupDealFacets = (
  deals: GroupDeal[]
): GroupDealFilterFacets => {
  const idolGroups = new Set<string>()
  const members = new Set<string>()
  const goodsTypes = new Set<string>()
  let minPrice = Number.POSITIVE_INFINITY
  let maxPrice = 0

  for (const deal of deals) {
    const metadata = deal.metadata ?? {}

    if (metadata.idol_group) {
      idolGroups.add(String(metadata.idol_group))
    }

    if (metadata.goods_type) {
      goodsTypes.add(String(metadata.goods_type))
    }

    for (const option of deal.options ?? []) {
      if (option.option_type === "member") {
        members.add(option.label)
      }

      if (option.option_type === "version" && !metadata.goods_type) {
        goodsTypes.add(option.label)
      }
    }

    minPrice = Math.min(minPrice, deal.deal_price)
    maxPrice = Math.max(maxPrice, deal.deal_price)
  }

  return {
    idolGroups: [...idolGroups].sort(),
    members: [...members].sort(),
    goodsTypes: [...goodsTypes].sort(),
    minPrice: Number.isFinite(minPrice) ? minPrice : 0,
    maxPrice: maxPrice || 0,
  }
}

const matchesMetadata = (
  deal: GroupDeal,
  key: "idol_group" | "goods_type",
  value: string
): boolean => {
  if (!value) {
    return true
  }

  return String(deal.metadata?.[key] ?? "") === value
}

const matchesMember = (deal: GroupDeal, member: string): boolean => {
  if (!member) {
    return true
  }

  return (deal.options ?? []).some(
    (option) => option.option_type === "member" && option.label === member
  )
}

const matchesQuery = (deal: GroupDeal, query: string): boolean => {
  if (!query.trim()) {
    return true
  }

  const normalized = query.trim().toLowerCase()

  const memberLabels = (deal.options ?? [])
    .filter((option) => option.option_type === "member")
    .map((option) => option.label.toLowerCase())

  const goodsType = String(deal.metadata?.goods_type ?? "").toLowerCase()

  return (
    deal.title.toLowerCase().includes(normalized) ||
    (deal.description ?? "").toLowerCase().includes(normalized) ||
    String(deal.metadata?.idol_group ?? "")
      .toLowerCase()
      .includes(normalized) ||
    goodsType.includes(normalized) ||
    memberLabels.some((label) => label.includes(normalized))
  )
}

const sortGroupDeals = (
  deals: GroupDeal[],
  sortBy: GroupDealFilterState["sortBy"]
): GroupDeal[] => {
  const sorted = [...deals]

  if (sortBy === "newest") {
    return sorted.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  return sorted.sort(
    (a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime()
  )
}

export const filterGroupDeals = (
  deals: GroupDeal[],
  filters: GroupDealFilterState
): GroupDeal[] => {
  const query = filters.query.trim()
  const shouldApplyQuery = query.length >= SEARCH_MIN_LENGTH

  const filtered = deals.filter((deal) => {
    if (!isDepositSecured(deal)) {
      return false
    }

    if (shouldApplyQuery && !matchesQuery(deal, query)) {
      return false
    }

    if (!matchesMetadata(deal, "idol_group", filters.idolGroup)) {
      return false
    }

    if (!matchesMetadata(deal, "goods_type", filters.goodsType)) {
      return false
    }

    if (!matchesMember(deal, filters.member)) {
      return false
    }

    if (filters.minPrice != null && deal.deal_price < filters.minPrice) {
      return false
    }

    if (filters.maxPrice != null && deal.deal_price > filters.maxPrice) {
      return false
    }

    if (filters.vacantOnly) {
      const favorite = filters.favoriteMember || filters.member

      if (favorite) {
        if (!hasMemberVacancy(deal, favorite)) {
          return false
        }
      } else if (isDealSoldOut(deal)) {
        return false
      }
    }

    return true
  })

  return sortGroupDeals(filtered, filters.sortBy)
}

export const summarizeOptionVacancy = (
  options: GroupDealOption[] = []
): string[] => {
  return options
    .filter((option) => option.option_type === "member")
    .map((option) => {
      const remaining =
        option.max_quantity == null
          ? null
          : Math.max(0, option.max_quantity - option.current_quantity)

      return `${option.label}:${remaining == null ? "∞" : remaining}`
    })
}

export const hasActiveFilters = (filters: GroupDealFilterState): boolean => {
  return (
    filters.query.trim().length >= SEARCH_MIN_LENGTH ||
    Boolean(filters.idolGroup) ||
    Boolean(filters.member) ||
    Boolean(filters.goodsType) ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    Boolean(filters.favoriteMember) ||
    filters.vacantOnly
  )
}
