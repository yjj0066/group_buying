import type { GroupDeal, GroupDealOption } from "types/group-deal"
import { hasMemberVacancy, isDealSoldOut } from "types/group-deal"

export type GroupDealFilterState = {
  query: string
  idolGroup: string
  member: string
  goodsType: string
  minPrice: number | null
  maxPrice: number | null
  favoriteMember: string
  vacantOnly: boolean
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
}

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

  return (
    deal.title.toLowerCase().includes(normalized) ||
    (deal.description ?? "").toLowerCase().includes(normalized) ||
    String(deal.metadata?.idol_group ?? "")
      .toLowerCase()
      .includes(normalized)
  )
}

export const filterGroupDeals = (
  deals: GroupDeal[],
  filters: GroupDealFilterState
): GroupDeal[] => {
  return deals.filter((deal) => {
    if (!matchesQuery(deal, filters.query)) {
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
