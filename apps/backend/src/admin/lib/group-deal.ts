import { GroupDealStatus } from "../../types/group-buying"
import type { SerializedGroupDeal } from "../../utils/query-group-deals"

export type AdminGroupDeal = SerializedGroupDeal

export type AdminProductOption = {
  id: string
  title: string
  variants: Array<{
    id: string
    title: string
    prices?: Array<{
      amount: number
      currency_code: string
    }>
  }>
}

export const GROUP_DEAL_STATUS_LABELS: Record<string, string> = {
  [GroupDealStatus.DRAFT]: "Draft",
  [GroupDealStatus.OPEN]: "Open",
  [GroupDealStatus.MINIMUM_REACHED]: "Minimum Reached",
  [GroupDealStatus.CLOSED]: "Closed",
  [GroupDealStatus.FAILED]: "Failed",
  [GroupDealStatus.CANCELLED]: "Cancelled",
}

export const formatDealDate = (value: string): string => {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export const toDateTimeLocalValue = (value: string): string => {
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)

  return local.toISOString().slice(0, 16)
}

export const fromDateTimeLocalValue = (value: string): string => {
  return new Date(value).toISOString()
}

export const getParticipationRate = (deal: AdminGroupDeal): number => {
  if (!deal.min_participants) {
    return 0
  }

  return Math.min(
    100,
    Math.round((deal.current_participants / deal.min_participants) * 100)
  )
}
