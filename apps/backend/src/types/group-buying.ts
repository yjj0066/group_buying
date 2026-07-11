export enum GroupDealStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  SUCCESS = "success",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum GroupDealParticipantStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
}

export type GroupDealDTO = {
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
  starts_at: Date
  ends_at: Date
  metadata: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
}

export type GroupDealParticipantDTO = {
  id: string
  group_deal_id: string
  customer_id: string | null
  email: string
  quantity: number
  status: GroupDealParticipantStatus
  order_id: string | null
  created_at: Date
  updated_at: Date
}
