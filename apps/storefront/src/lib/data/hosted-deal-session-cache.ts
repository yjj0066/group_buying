import type { GroupDeal } from "types/group-deal"

const CACHE_PREFIX = "gb-hosted-deal-"

export const cacheHostedDeal = (deal: GroupDeal) => {
  if (typeof window === "undefined") {
    return
  }

  sessionStorage.setItem(`${CACHE_PREFIX}${deal.id}`, JSON.stringify(deal))
}

export const loadCachedHostedDeal = (dealId: string): GroupDeal | null => {
  if (typeof window === "undefined") {
    return null
  }

  const raw = sessionStorage.getItem(`${CACHE_PREFIX}${dealId}`)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as GroupDeal
  } catch {
    return null
  }
}
