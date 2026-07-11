export type GroupDealStatus =
  | "draft"
  | "active"
  | "success"
  | "failed"
  | "cancelled"

export type GroupDealParticipantStatus =
  | "pending"
  | "confirmed"
  | "cancelled"

export type GroupDealParticipant = {
  id: string
  customer_id: string | null
  email: string
  quantity: number
  status: GroupDealParticipantStatus
  order_id: string | null
  created_at: string
  updated_at: string
}

export type GroupDeal = {
  id: string
  title: string
  description: string | null
  product_id: string
  variant_id: string | null
  target_quantity: number
  current_quantity: number
  original_price: number
  deal_price: number
  currency_code: string
  status: GroupDealStatus
  starts_at: string
  ends_at: string
  metadata: Record<string, unknown> | null
  participants?: GroupDealParticipant[]
  created_at: string
  updated_at: string
}

export type GroupDealsResponse = {
  group_deals: GroupDeal[]
}

export type GroupDealResponse = {
  group_deal: GroupDeal
}

export type JoinGroupDealResponse = {
  participant: GroupDealParticipant
  group_deal: GroupDeal
}
