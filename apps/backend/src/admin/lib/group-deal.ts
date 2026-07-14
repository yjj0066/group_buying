import { GroupDealDepositStatus, GroupDealReceiptStatus, GroupDealStatus } from "../../types/group-buying"
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
  [GroupDealStatus.SETTLED]: "Settled",
}

export const DEPOSIT_STATUS_LABELS: Record<string, string> = {
  [GroupDealDepositStatus.PENDING]: "Deposit Pending",
  [GroupDealDepositStatus.DEPOSITED]: "Deposit Paid",
  [GroupDealDepositStatus.REFUNDED]: "Deposit Refunded",
}

export const RECEIPT_STATUS_LABELS: Record<string, string> = {
  [GroupDealReceiptStatus.PENDING]: "Receipt Pending",
  [GroupDealReceiptStatus.UPLOADED]: "Receipt Uploaded",
  [GroupDealReceiptStatus.VERIFIED]: "Receipt Verified",
  [GroupDealReceiptStatus.REJECTED]: "Receipt Rejected",
}

export const getDepositBadgeColor = (
  status: string
): "grey" | "green" | "orange" | "blue" => {
  switch (status) {
    case GroupDealDepositStatus.DEPOSITED:
      return "green"
    case GroupDealDepositStatus.REFUNDED:
      return "blue"
    case GroupDealDepositStatus.PENDING:
    default:
      return "orange"
  }
}

export const getReceiptBadgeColor = (
  status: string
): "grey" | "green" | "orange" | "red" => {
  switch (status) {
    case GroupDealReceiptStatus.VERIFIED:
      return "green"
    case GroupDealReceiptStatus.UPLOADED:
      return "orange"
    case GroupDealReceiptStatus.REJECTED:
      return "red"
    default:
      return "grey"
  }
}

export const isParticipantPaid = (status: string): boolean => {
  return status === "confirmed" || status === "reserved"
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
