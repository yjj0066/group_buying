import {
  GroupDealDepositStatus,
  GroupDealParticipantStatus,
  GroupDealReceiptStatus,
  GroupDealStatus,
} from "../types/group-buying"

export type GroupDealParticipationStage =
  | "recruiting"
  | "payment_complete"
  | "purchasing"
  | "shipping"
  | "delivery_confirmed"

export type GroupDealLeaderStage =
  | "created"
  | "deposit_pending"
  | "recruiting"
  | "verify_and_order"
  | "receive_inspect"
  | "shipping"
  | "closing"
  | "settled"

type ParticipantRecord = Record<string, unknown>
type DealRecord = Record<string, unknown>

export const resolveParticipationStage = (input: {
  deal: DealRecord
  participant: ParticipantRecord
}): GroupDealParticipationStage => {
  const { deal, participant } = input

  if (participant.delivery_confirmed_at) {
    return "delivery_confirmed"
  }

  if (participant.tracking_number) {
    return "shipping"
  }

  const dealStatus = String(deal.status ?? "")

  if (
    dealStatus === GroupDealStatus.CLOSED ||
    dealStatus === GroupDealStatus.SETTLED
  ) {
    return "purchasing"
  }

  const participantStatus = String(participant.status ?? "")

  if (
    participantStatus === GroupDealParticipantStatus.CONFIRMED ||
    participant.captured_at
  ) {
    return "payment_complete"
  }

  return "recruiting"
}

export const resolveLeaderStage = (deal: DealRecord): GroupDealLeaderStage => {
  const dealStatus = String(deal.status ?? "")
  const depositStatus = String(deal.deposit_status ?? GroupDealDepositStatus.PENDING)
  const receiptStatus = String(deal.purchase_receipt_status ?? "pending")

  if (dealStatus === GroupDealStatus.SETTLED) {
    return "settled"
  }

  if (dealStatus === GroupDealStatus.CLOSED) {
    if (receiptStatus !== GroupDealReceiptStatus.VERIFIED) {
      return "receive_inspect"
    }

    return "shipping"
  }

  if (dealStatus === GroupDealStatus.MINIMUM_REACHED) {
    return "verify_and_order"
  }

  if (dealStatus === GroupDealStatus.OPEN) {
    return "recruiting"
  }

  if (
    dealStatus === GroupDealStatus.DRAFT &&
    depositStatus !== GroupDealDepositStatus.DEPOSITED
  ) {
    return "deposit_pending"
  }

  return "created"
}

export const serializeAccountGroupDeal = (deal: DealRecord) => ({
  id: String(deal.id),
  title: String(deal.title ?? ""),
  status: String(deal.status ?? ""),
  leader_stage: resolveLeaderStage(deal),
  deposit_status: String(deal.deposit_status ?? GroupDealDepositStatus.PENDING),
  deposit_amount:
    deal.deposit_amount != null ? Number(deal.deposit_amount) : null,
  currency_code: String(deal.currency_code ?? "krw").toLowerCase(),
  current_participants: Number(deal.current_participants ?? 0),
  target_quantity: Number(deal.target_quantity ?? 0),
  ends_at: deal.ends_at
    ? new Date(deal.ends_at as string | Date).toISOString()
    : null,
  purchase_receipt_status: String(deal.purchase_receipt_status ?? "pending"),
  created_at: deal.created_at
    ? new Date(deal.created_at as string | Date).toISOString()
    : new Date(0).toISOString(),
})

export const serializeAccountParticipation = (input: {
  participant: ParticipantRecord
  deal: DealRecord
}) => {
  const { participant, deal } = input
  const stage = resolveParticipationStage({ deal, participant })

  return {
    participant_id: String(participant.id),
    quantity: Number(participant.quantity ?? 1),
    status: String(participant.status ?? ""),
    stage,
    tracking_number:
      participant.tracking_number != null
        ? String(participant.tracking_number)
        : null,
    carrier: participant.carrier != null ? String(participant.carrier) : null,
    payment_deadline: participant.payment_deadline
      ? new Date(
          participant.payment_deadline as string | Date
        ).toISOString()
      : null,
    delivery_confirmed_at: participant.delivery_confirmed_at
      ? new Date(
          participant.delivery_confirmed_at as string | Date
        ).toISOString()
      : null,
    group_deal: serializeAccountGroupDeal(deal),
    created_at: participant.created_at
      ? new Date(participant.created_at as string | Date).toISOString()
      : new Date(0).toISOString(),
  }
}

export type SavedPaymentMethodRecord = {
  id: string
  provider: "stripe" | "toss"
  label: string
  is_default: boolean
  last4?: string | null
  brand?: string | null
  external_id?: string | null
  setup_intent_id?: string | null
  created_at: string
}

export type GroupBuyingPreferences = {
  favorite_idol_group: string | null
  favorite_member: string | null
  notify_vacancy: boolean
  notify_progress: boolean
}

const DEFAULT_PREFERENCES: GroupBuyingPreferences = {
  favorite_idol_group: null,
  favorite_member: null,
  notify_vacancy: true,
  notify_progress: true,
}

export const readGroupBuyingPreferences = (
  metadata: Record<string, unknown> | null | undefined
): GroupBuyingPreferences => {
  const raw = metadata?.group_buying_preferences

  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PREFERENCES }
  }

  const prefs = raw as Record<string, unknown>

  return {
    favorite_idol_group:
      typeof prefs.favorite_idol_group === "string"
        ? prefs.favorite_idol_group
        : null,
    favorite_member:
      typeof prefs.favorite_member === "string" ? prefs.favorite_member : null,
    notify_vacancy:
      typeof prefs.notify_vacancy === "boolean"
        ? prefs.notify_vacancy
        : DEFAULT_PREFERENCES.notify_vacancy,
    notify_progress:
      typeof prefs.notify_progress === "boolean"
        ? prefs.notify_progress
        : DEFAULT_PREFERENCES.notify_progress,
  }
}

export const readSavedPaymentMethods = (
  metadata: Record<string, unknown> | null | undefined
): SavedPaymentMethodRecord[] => {
  const raw = metadata?.saved_payment_methods

  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const record = item as Record<string, unknown>

      return {
        id: String(record.id ?? ""),
        provider: record.provider === "toss" ? "toss" : "stripe",
        label: String(record.label ?? ""),
        is_default: record.is_default === true,
        last4:
          record.last4 != null ? String(record.last4) : null,
        brand: record.brand != null ? String(record.brand) : null,
        created_at: record.created_at
          ? new Date(record.created_at as string | Date).toISOString()
          : new Date(0).toISOString(),
      }
    })
    .filter((item) => item.id)
}

export const appendSavedPaymentMethod = (
  existing: SavedPaymentMethodRecord[],
  method: Omit<SavedPaymentMethodRecord, "id" | "created_at"> & {
    id?: string
    created_at?: string
  }
): SavedPaymentMethodRecord[] => {
  const nextMethod: SavedPaymentMethodRecord = {
    id: method.id ?? `pm_${Date.now()}`,
    provider: method.provider,
    label: method.label,
    is_default: method.is_default,
    last4: method.last4 ?? null,
    brand: method.brand ?? null,
    external_id: method.external_id ?? null,
    setup_intent_id: method.setup_intent_id ?? null,
    created_at: method.created_at ?? new Date().toISOString(),
  }

  return existing
    .map((item) =>
      nextMethod.is_default ? { ...item, is_default: false } : item
    )
    .concat(nextMethod)
}

export const buildSettlementRecords = (input: {
  hostedDeals: DealRecord[]
  participations: Array<{ participant: ParticipantRecord; deal: DealRecord }>
}) => {
  const records: Array<{
    id: string
    type: "deposit_refund" | "escrow_release" | "participant_refund"
    amount: number | null
    currency_code: string
    status: "completed" | "pending" | "failed"
    group_deal_id: string
    group_deal_title: string
    description: string
    processed_at: string | null
  }> = []

  for (const deal of input.hostedDeals) {
    if (deal.deposit_status === GroupDealDepositStatus.REFUNDED) {
      records.push({
        id: `deposit-refund-${deal.id}`,
        type: "deposit_refund",
        amount:
          deal.deposit_amount != null ? Number(deal.deposit_amount) : null,
        currency_code: String(deal.currency_code ?? "krw").toLowerCase(),
        status: "completed",
        group_deal_id: String(deal.id),
        group_deal_title: String(deal.title ?? ""),
        description: "Leader deposit refunded",
        processed_at: deal.updated_at
          ? new Date(deal.updated_at as string | Date).toISOString()
          : null,
      })
    }
  }

  for (const entry of input.participations) {
    const { participant, deal } = entry
    const status = String(participant.status ?? "")

    if (status !== GroupDealParticipantStatus.CANCELLED) {
      continue
    }

    if (!participant.capture_payment_key && !participant.captured_at) {
      continue
    }

    records.push({
      id: `participant-refund-${participant.id}`,
      type: "participant_refund",
      amount:
        participant.first_payment_amount != null
          ? Number(participant.first_payment_amount)
          : null,
      currency_code: String(deal.currency_code ?? "krw").toLowerCase(),
      status: "completed",
      group_deal_id: String(deal.id),
      group_deal_title: String(deal.title ?? ""),
      description: "Participant escrow refunded",
      processed_at: participant.updated_at
        ? new Date(participant.updated_at as string | Date).toISOString()
        : null,
    })
  }

  for (const entry of input.participations) {
    const { participant, deal } = entry

    if (!participant.delivery_confirmed_at) {
      continue
    }

    if (String(deal.status ?? "") !== GroupDealStatus.SETTLED) {
      continue
    }

    records.push({
      id: `escrow-release-${participant.id}`,
      type: "escrow_release",
      amount:
        participant.first_payment_amount != null
          ? Number(participant.first_payment_amount)
          : null,
      currency_code: String(deal.currency_code ?? "krw").toLowerCase(),
      status: "completed",
      group_deal_id: String(deal.id),
      group_deal_title: String(deal.title ?? ""),
      description: "Escrow released after delivery confirmation",
      processed_at: participant.delivery_confirmed_at
        ? new Date(
            participant.delivery_confirmed_at as string | Date
          ).toISOString()
        : null,
    })
  }

  return records.sort((a, b) => {
    const aTime = a.processed_at ? new Date(a.processed_at).getTime() : 0
    const bTime = b.processed_at ? new Date(b.processed_at).getTime() : 0

    return bTime - aTime
  })
}
