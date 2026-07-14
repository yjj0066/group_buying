import { MedusaError } from "@medusajs/framework/utils"
import {
  GroupDealDepositStatus,
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
  deposit_status?: GroupDealDepositStatus | string
}

export type ConfirmedParticipantLike = {
  status: GroupDealParticipantStatus | string
  customer_id?: string | null
  email: string
  quantity: number
}

/** 빌링키 예약 또는 결제 완료 — 모집 인원/수량 집계에 포함 */
export const COMMITTED_PARTICIPANT_STATUSES: GroupDealParticipantStatus[] = [
  GroupDealParticipantStatus.RESERVED,
  GroupDealParticipantStatus.CONFIRMED,
]

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

export const isDealDepositSecured = (deal: GroupDealLike): boolean => {
  return deal.deposit_status === GroupDealDepositStatus.DEPOSITED
}

export const isDealJoinable = (
  deal: GroupDealLike,
  now: Date = new Date()
): boolean => {
  const status = normalizeDealStatus(deal.status)

  if (!JOINABLE_DEAL_STATUSES.includes(status as GroupDealStatus)) {
    return false
  }

  if (!isDealDepositSecured(deal)) {
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
  if (!isDealDepositSecured(deal)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This group deal is not active until the leader deposit is paid"
    )
  }

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
 * 참여율 = 빌링키 예약 또는 결제 완료 고객 수 / 최소 모집 인원
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
    status === GroupDealStatus.SETTLED ||
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

const countUniqueParticipantsByStatuses = (
  participants: ConfirmedParticipantLike[],
  statuses: Set<GroupDealParticipantStatus | string>
): number => {
  const uniqueKeys = new Set<string>()

  for (const participant of participants) {
    if (!statuses.has(participant.status)) {
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

const sumQuantityByStatuses = (
  participants: ConfirmedParticipantLike[],
  statuses: Set<GroupDealParticipantStatus | string>
): number => {
  return participants
    .filter((participant) => statuses.has(participant.status))
    .reduce((total, participant) => total + participant.quantity, 0)
}

export const countUniqueCommittedParticipants = (
  participants: ConfirmedParticipantLike[]
): number => {
  return countUniqueParticipantsByStatuses(
    participants,
    new Set(COMMITTED_PARTICIPANT_STATUSES)
  )
}

export const sumCommittedQuantity = (
  participants: ConfirmedParticipantLike[]
): number => {
  return sumQuantityByStatuses(
    participants,
    new Set(COMMITTED_PARTICIPANT_STATUSES)
  )
}

export const countUniqueConfirmedParticipants = (
  participants: ConfirmedParticipantLike[]
): number => {
  return countUniqueParticipantsByStatuses(
    participants,
    new Set([GroupDealParticipantStatus.CONFIRMED])
  )
}

export const sumConfirmedQuantity = (
  participants: ConfirmedParticipantLike[]
): number => {
  return sumQuantityByStatuses(
    participants,
    new Set([GroupDealParticipantStatus.CONFIRMED])
  )
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
