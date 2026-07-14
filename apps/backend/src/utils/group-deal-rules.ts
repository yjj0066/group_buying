import { MedusaError } from "@medusajs/framework/utils"
import {
  GroupDealParticipantStatus,
  GroupDealStatus,
} from "../types/group-buying"

export const JOINABLE_DEAL_STATUSES: GroupDealStatus[] = [
  GroupDealStatus.OPEN,
  GroupDealStatus.MINIMUM_REACHED,
]

export type GroupDealLike = {
  status: GroupDealStatus | string
  starts_at: Date | string
  ends_at: Date | string
  min_participants: number
  current_participants: number
  current_quantity: number
  max_quantity?: number | null
}

export type ConfirmedParticipantLike = {
  status: GroupDealParticipantStatus | string
  customer_id?: string | null
  email: string
  quantity: number
}

export const normalizeDealStatus = (
  status: string
): GroupDealStatus | string => {
  if (status === "active") {
    return GroupDealStatus.OPEN
  }

  if (status === "success") {
    return GroupDealStatus.CLOSED
  }

  return status
}

export const isDealJoinable = (
  deal: GroupDealLike,
  now: Date = new Date()
): boolean => {
  const status = normalizeDealStatus(deal.status)

  if (!JOINABLE_DEAL_STATUSES.includes(status as GroupDealStatus)) {
    return false
  }

  const startsAt = new Date(deal.starts_at)
  const endsAt = new Date(deal.ends_at)

  return now >= startsAt && now <= endsAt
}

export const assertDealJoinable = (
  deal: GroupDealLike,
  quantity: number,
  now: Date = new Date()
): void => {
  if (!isDealJoinable(deal, now)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This group deal is not open for participation"
    )
  }

  if (quantity <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Quantity must be greater than zero"
    )
  }

  if (deal.max_quantity != null) {
    const remaining = deal.max_quantity - deal.current_quantity

    if (quantity > remaining) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Only ${Math.max(remaining, 0)} unit(s) remaining for this group deal`
      )
    }
  }
}

/**
 * 참여율 = 결제 완료 고객 수 / 최소 모집 인원 (v1 current_participants / min_participants)
 */
export const calculateParticipationRate = (
  currentParticipants: number,
  minParticipants: number
): number => {
  if (minParticipants <= 0) {
    return 0
  }

  return Math.min(
    100,
    Math.round((currentParticipants / minParticipants) * 100)
  )
}

/**
 * v1 상태 전이:
 * - open + current_participants >= min_participants → minimum_reached
 * - current_quantity >= max_quantity → closed (매진)
 */
export const evaluateDealStatus = (
  deal: GroupDealLike
): GroupDealStatus | string => {
  const status = normalizeDealStatus(deal.status)

  if (
    status === GroupDealStatus.CANCELLED ||
    status === GroupDealStatus.FAILED ||
    status === GroupDealStatus.CLOSED ||
    status === GroupDealStatus.DRAFT
  ) {
    return status
  }

  if (
    deal.max_quantity != null &&
    deal.current_quantity >= deal.max_quantity
  ) {
    return GroupDealStatus.CLOSED
  }

  if (
    deal.current_participants >= deal.min_participants &&
    status === GroupDealStatus.OPEN
  ) {
    return GroupDealStatus.MINIMUM_REACHED
  }

  return status
}

export const countUniqueConfirmedParticipants = (
  participants: ConfirmedParticipantLike[]
): number => {
  const uniqueKeys = new Set<string>()

  for (const participant of participants) {
    if (participant.status !== GroupDealParticipantStatus.CONFIRMED) {
      continue
    }

    const key =
      participant.customer_id?.trim() ||
      participant.email.trim().toLowerCase()

    if (key) {
      uniqueKeys.add(key)
    }
  }

  return uniqueKeys.size
}

export const sumConfirmedQuantity = (
  participants: ConfirmedParticipantLike[]
): number => {
  return participants
    .filter(
      (participant) =>
        participant.status === GroupDealParticipantStatus.CONFIRMED
    )
    .reduce((total, participant) => total + participant.quantity, 0)
}

export const buildParticipantKey = (input: {
  customer_id?: string | null
  email: string
}): string => {
  if (input.customer_id?.trim()) {
    return `customer:${input.customer_id.trim()}`
  }

  return `email:${input.email.trim().toLowerCase()}`
}
