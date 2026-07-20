import type { AccountGroupDeal } from "types/account-group-deals"
import { createMemberOption, type GroupDeal, type GroupDealStatus } from "types/group-deal"

const leaderStageToStatus = (
  leaderStage: AccountGroupDeal["leader_stage"]
): GroupDealStatus | null => {
  const map: Partial<
    Record<AccountGroupDeal["leader_stage"], GroupDealStatus>
  > = {
    created: "draft",
    deposit_pending: "deposit_pending",
    recruiting: "recruiting",
    verify_and_order: "purchase",
    receive_inspect: "opening",
    shipping: "shipping",
    closing: "settlement",
    settled: "completed",
  }

  return map[leaderStage] ?? null
}

type MemberSeatMetadata = {
  label?: string
  price?: number
  quantity?: number
}

const readMemberSeatsFromMetadata = (
  metadata: Record<string, unknown> | null | undefined
): MemberSeatMetadata[] => {
  const raw = metadata?.member_seats

  if (!Array.isArray(raw)) {
    return []
  }

  return raw.filter(
    (seat): seat is MemberSeatMetadata =>
      Boolean(seat && typeof seat === "object")
  )
}

export const mapAccountGroupDealToGroupDeal = (
  deal: AccountGroupDeal
): GroupDeal => {
  const status =
    (deal.status as GroupDealStatus) ||
    leaderStageToStatus(deal.leader_stage) ||
    "recruiting"
  const endsAt = deal.ends_at ?? deal.created_at
  const metadata = (deal.metadata ?? {}) as Record<string, unknown>
  const memberSeats = readMemberSeatsFromMetadata(metadata)
  const activeSeats = memberSeats.filter(
    (seat) => seat.label?.trim() && Number(seat.quantity) > 0
  )
  const idolGroup =
    typeof metadata.idol_group === "string" ? metadata.idol_group.trim() : ""
  const goodsType =
    typeof metadata.goods_type === "string" ? metadata.goods_type.trim() : ""
  const metadataDescription =
    typeof metadata.description === "string" ? metadata.description.trim() : ""
  const description =
    metadataDescription ||
    (idolGroup && goodsType
      ? `${idolGroup} · ${goodsType}`
      : idolGroup || goodsType || null)
  const primaryPrice =
    activeSeats[0]?.price ??
    (typeof metadata.deal_price === "number" ? metadata.deal_price : 0)
  const originalPrice =
    typeof metadata.original_price === "number"
      ? metadata.original_price
      : primaryPrice
  const totalSeats = activeSeats.length
    ? activeSeats.reduce(
        (sum, seat) => sum + (Number(seat.quantity) || 0),
        0
      )
    : deal.target_quantity
  const options = activeSeats.map((seat, index) =>
    createMemberOption(
      deal.id,
      `opt-${index}-${seat.label?.trim() ?? "member"}`,
      seat.label?.trim() ?? "",
      Number(seat.price) || 0,
      Number(seat.price) || 0,
      Number(seat.quantity) || 0,
      0,
      index
    )
  )

  return {
    id: deal.id,
    title: deal.title,
    description,
    product_id: null,
    variant_id: null,
    min_participants: totalSeats,
    current_participants: deal.current_participants,
    target_quantity: totalSeats,
    current_quantity: deal.current_participants,
    max_quantity: null,
    original_price: originalPrice,
    deal_price: primaryPrice,
    currency_code: deal.currency_code,
    status,
    starts_at: deal.created_at,
    ends_at: endsAt,
    metadata: {
      ...metadata,
      hosted: true,
      leader_stage: deal.leader_stage,
    },
    leader_customer_id: null,
    deposit_status: deal.deposit_status as GroupDeal["deposit_status"],
    deposit_amount: deal.deposit_amount,
    purchase_receipt_status:
      deal.purchase_receipt_status as GroupDeal["purchase_receipt_status"],
    purchase_receipt_structured: deal.purchase_receipt_structured ?? null,
    receipt_ai_status:
      deal.receipt_ai_status as GroupDeal["receipt_ai_status"],
    receipt_ai_confidence: deal.receipt_ai_confidence ?? null,
    tracking_ai_status:
      deal.tracking_ai_status as GroupDeal["tracking_ai_status"],
    tracking_ai_confidence: deal.tracking_ai_confidence ?? null,
    report_stage: deal.report_stage as GroupDeal["report_stage"],
    dispute_status: deal.dispute_status as GroupDeal["dispute_status"],
    options,
    total_seats: totalSeats,
    filled_seats: deal.current_participants,
    created_at: deal.created_at,
    updated_at: deal.created_at,
  }
}
