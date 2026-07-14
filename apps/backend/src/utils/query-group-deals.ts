import { MedusaContainer } from "@medusajs/framework/types"
import { GROUP_BUYING_MODULE } from "../modules/group-buying"
import GroupBuyingModuleService from "../modules/group-buying/service"
import { GroupDealStatus } from "../types/group-buying"

export type SerializedGroupDealOption = {
  id: string
  group_deal_id: string
  option_type: string
  option_key: string
  label: string
  deal_price: number | null
  original_price: number | null
  max_quantity: number | null
  target_quantity: number | null
  current_quantity: number
  sort_order: number
  is_active: boolean
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type SerializedGroupDealSelection = {
  id: string
  participant_id: string
  option_id: string
  quantity: number
  unit_price: number
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type SerializedGroupDeal = {
  id: string
  title: string
  description: string | null
  product_id: string
  variant_id: string | null
  min_participants: number
  current_participants: number
  target_quantity: number
  current_quantity: number
  max_quantity: number | null
  original_price: number
  deal_price: number
  currency_code: string
  payment_phase_mode: string
  shipping_fee_status: string
  estimated_shipping_fee: number | null
  shipping_fee_note: string | null
  status: GroupDealStatus | string
  starts_at: string
  ends_at: string
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  options?: SerializedGroupDealOption[]
  participants?: SerializedGroupDealParticipant[]
}

export type SerializedGroupDealParticipant = {
  id: string
  group_deal_id: string
  customer_id: string | null
  email: string
  quantity: number
  status: string
  cart_id: string | null
  order_id: string | null
  payment_session_id: string | null
  first_payment_amount: number | null
  second_payment_amount: number | null
  second_payment_status: string
  second_payment_order_id: string | null
  capture_attempts: number
  last_capture_error: string | null
  reserved_at: string | null
  captured_at: string | null
  created_at: string
  updated_at: string
  selections?: SerializedGroupDealSelection[]
}

const serializeGroupDealOption = (
  option: Record<string, unknown>
): SerializedGroupDealOption => ({
  id: String(option.id),
  group_deal_id: String(option.group_deal_id),
  option_type: String(option.option_type),
  option_key: String(option.option_key),
  label: String(option.label),
  deal_price: option.deal_price == null ? null : Number(option.deal_price),
  original_price:
    option.original_price == null ? null : Number(option.original_price),
  max_quantity:
    option.max_quantity == null ? null : Number(option.max_quantity),
  target_quantity:
    option.target_quantity == null ? null : Number(option.target_quantity),
  current_quantity: Number(option.current_quantity ?? 0),
  sort_order: Number(option.sort_order ?? 0),
  is_active: Boolean(option.is_active ?? true),
  metadata: (option.metadata as Record<string, unknown> | null) ?? null,
  created_at: new Date(option.created_at as string | Date).toISOString(),
  updated_at: new Date(option.updated_at as string | Date).toISOString(),
})

const serializeGroupDealSelection = (
  selection: Record<string, unknown>
): SerializedGroupDealSelection => ({
  id: String(selection.id),
  participant_id: String(selection.participant_id),
  option_id: String(selection.option_id),
  quantity: Number(selection.quantity ?? 1),
  unit_price: Number(selection.unit_price ?? 0),
  metadata: (selection.metadata as Record<string, unknown> | null) ?? null,
  created_at: new Date(selection.created_at as string | Date).toISOString(),
  updated_at: new Date(selection.updated_at as string | Date).toISOString(),
})

const serializeGroupDealParticipant = (
  participant: Record<string, unknown>,
  selections?: Record<string, unknown>[]
): SerializedGroupDealParticipant => ({
  id: String(participant.id),
  group_deal_id: String(participant.group_deal_id),
  customer_id: (participant.customer_id as string | null) ?? null,
  email: String(participant.email),
  quantity: Number(participant.quantity ?? 1),
  status: String(participant.status),
  cart_id: (participant.cart_id as string | null) ?? null,
  order_id: (participant.order_id as string | null) ?? null,
  payment_session_id:
    (participant.payment_session_id as string | null) ?? null,
  first_payment_amount:
    participant.first_payment_amount == null
      ? null
      : Number(participant.first_payment_amount),
  second_payment_amount:
    participant.second_payment_amount == null
      ? null
      : Number(participant.second_payment_amount),
  second_payment_status: String(
    participant.second_payment_status ?? "not_required"
  ),
  second_payment_order_id:
    (participant.second_payment_order_id as string | null) ?? null,
  capture_attempts: Number(participant.capture_attempts ?? 0),
  last_capture_error:
    (participant.last_capture_error as string | null) ?? null,
  reserved_at: participant.reserved_at
    ? new Date(participant.reserved_at as string | Date).toISOString()
    : null,
  captured_at: participant.captured_at
    ? new Date(participant.captured_at as string | Date).toISOString()
    : null,
  created_at: new Date(
    participant.created_at as string | Date
  ).toISOString(),
  updated_at: new Date(
    participant.updated_at as string | Date
  ).toISOString(),
  selections: selections?.map(serializeGroupDealSelection),
})

const serializeGroupDeal = (
  deal: Record<string, unknown>,
  extras?: {
    participants?: Record<string, unknown>[]
    options?: Record<string, unknown>[]
    participantSelections?: Map<string, Record<string, unknown>[]>
  }
): SerializedGroupDeal => {
  return {
    id: String(deal.id),
    title: String(deal.title),
    description: (deal.description as string | null) ?? null,
    product_id: String(deal.product_id),
    variant_id: (deal.variant_id as string | null) ?? null,
    min_participants: Number(deal.min_participants ?? 0),
    current_participants: Number(deal.current_participants ?? 0),
    target_quantity: Number(deal.target_quantity ?? 0),
    current_quantity: Number(deal.current_quantity ?? 0),
    max_quantity:
      deal.max_quantity == null ? null : Number(deal.max_quantity),
    original_price: Number(deal.original_price ?? 0),
    deal_price: Number(deal.deal_price ?? 0),
    currency_code: String(deal.currency_code ?? "KRW"),
    payment_phase_mode: String(deal.payment_phase_mode ?? "single"),
    shipping_fee_status: String(deal.shipping_fee_status ?? "not_applicable"),
    estimated_shipping_fee:
      deal.estimated_shipping_fee == null
        ? null
        : Number(deal.estimated_shipping_fee),
    shipping_fee_note: (deal.shipping_fee_note as string | null) ?? null,
    status: String(deal.status) as GroupDealStatus,
    starts_at: new Date(deal.starts_at as string | Date).toISOString(),
    ends_at: new Date(deal.ends_at as string | Date).toISOString(),
    metadata: (deal.metadata as Record<string, unknown> | null) ?? null,
    created_at: new Date(deal.created_at as string | Date).toISOString(),
    updated_at: new Date(deal.updated_at as string | Date).toISOString(),
    options: extras?.options?.map(serializeGroupDealOption),
    participants: extras?.participants?.map((participant) =>
      serializeGroupDealParticipant(
        participant,
        extras.participantSelections?.get(String(participant.id))
      )
    ),
  }
}

export const queryGroupDeals = async (
  scope: MedusaContainer,
  filters?: {
    status?: GroupDealStatus | GroupDealStatus[]
  },
  options?: { withOptions?: boolean }
): Promise<SerializedGroupDeal[]> => {
  const groupBuyingService: GroupBuyingModuleService =
    scope.resolve(GROUP_BUYING_MODULE)

  const deals = await groupBuyingService.listGroupDeals({
    ...(filters?.status ? { status: filters.status } : {}),
  })

  const results: SerializedGroupDeal[] = []

  for (const deal of deals) {
    let dealOptions: Record<string, unknown>[] | undefined

    if (options?.withOptions ?? true) {
      const listed = await groupBuyingService.listDealOptions(String(deal.id))
      dealOptions = listed as Record<string, unknown>[]
    }

    results.push(
      serializeGroupDeal(deal as Record<string, unknown>, {
        options: dealOptions,
      })
    )
  }

  return results
}

export const queryGroupDeal = async (
  scope: MedusaContainer,
  id: string,
  options?: {
    withParticipants?: boolean
    withOptions?: boolean
  }
): Promise<SerializedGroupDeal> => {
  const groupBuyingService: GroupBuyingModuleService =
    scope.resolve(GROUP_BUYING_MODULE)

  const deal = await groupBuyingService.retrieveGroupDeal(id)

  let participants: Record<string, unknown>[] | undefined
  let dealOptions: Record<string, unknown>[] | undefined
  const participantSelections = new Map<string, Record<string, unknown>[]>()

  if (options?.withOptions ?? true) {
    const listed = await groupBuyingService.listDealOptions(id)
    dealOptions = listed as Record<string, unknown>[]
  }

  if (options?.withParticipants) {
    const listed = await groupBuyingService.listGroupDealParticipants({
      group_deal_id: id,
    })

    participants = listed as Record<string, unknown>[]

    for (const participant of participants) {
      const selections = await groupBuyingService.listParticipantSelections(
        String(participant.id)
      )

      participantSelections.set(
        String(participant.id),
        selections as Record<string, unknown>[]
      )
    }
  }

  return serializeGroupDeal(deal as Record<string, unknown>, {
    participants,
    options: dealOptions,
    participantSelections,
  })
}
