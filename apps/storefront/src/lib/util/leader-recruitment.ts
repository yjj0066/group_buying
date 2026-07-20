import type { GroupDeal } from "types/group-deal"
import { getDealFillProgress } from "types/group-deal"

export const isRecruitmentPeriodEnded = (deal: GroupDeal): boolean =>
  new Date(deal.ends_at).getTime() <= Date.now()

export const isTargetQuantityReached = (deal: GroupDeal): boolean => {
  const { filled, total } = getDealFillProgress(deal)
  return total > 0 && filled >= total
}

export const isMinimumQuantityMet = (
  deal: GroupDeal,
  confirmedParticipantCount: number
): boolean => confirmedParticipantCount >= deal.min_participants

export const canCloseRecruitment = (
  deal: GroupDeal,
  confirmedParticipantCount: number
): boolean => {
  if (deal.status === "cancelled" || deal.status === "completed") {
    return false
  }

  const periodEnded = isRecruitmentPeriodEnded(deal)
  const targetReached = isTargetQuantityReached(deal)
  const minimumMet = isMinimumQuantityMet(deal, confirmedParticipantCount)

  return (periodEnded || targetReached) && minimumMet
}

export const canCancelDeal = (
  deal: GroupDeal,
  confirmedParticipantCount: number
): boolean => {
  if (deal.status === "cancelled" || deal.status === "completed") {
    return false
  }

  return !isMinimumQuantityMet(deal, confirmedParticipantCount)
}

export const buildParticipantApplyUrl = (
  origin: string,
  countryCode: string,
  dealId: string,
  dealRoute: (cc: string, id: string) => string
): string => `${origin}${dealRoute(countryCode, dealId)}`

export const buildKakaoShareUrl = (url: string, title: string): string => {
  const params = new URLSearchParams({ url, text: title })
  return `https://story.kakao.com/share?${params.toString()}`
}

export const buildTwitterShareUrl = (url: string, title: string): string => {
  const params = new URLSearchParams({ url, text: title })
  return `https://twitter.com/intent/tweet?${params.toString()}`
}
