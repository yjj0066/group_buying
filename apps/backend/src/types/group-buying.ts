export enum GroupDealStatus {
  DRAFT = "draft",
  /** 모집 중 (v1: open) */
  OPEN = "open",
  /** 최소 인원 달성, 추가 모집 가능 (v1: minimum_reached) */
  MINIMUM_REACHED = "minimum_reached",
  /** 재고 소진 또는 마감 (v1: closed) */
  CLOSED = "closed",
  /** 기한 내 최소 인원 미달 (v1: failed) */
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum GroupDealParticipantStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
}

/** @deprecated use GroupDealStatus.OPEN */
export const LEGACY_ACTIVE_STATUS = "active" as const
/** @deprecated use GroupDealStatus.CLOSED */
export const LEGACY_SUCCESS_STATUS = "success" as const

export type GroupDealDTO = {
  id: string
  title: string
  description: string | null
  product_id: string
  variant_id: string | null
  /** 최소 모집 인원 (고유 결제 완료 고객 수 기준, v1: min_participants) */
  min_participants: number
  /** 현재 결제 완료 고객 수 (v1: current_participants) */
  current_participants: number
  /** 목표 수량 — 특전/진행률 마일스톤용 */
  target_quantity: number
  /** 결제 완료 총 수량 */
  current_quantity: number
  /** 재고 상한 (v1: stock_quantity). null이면 제한 없음 */
  max_quantity: number | null
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
  cart_id: string | null
  order_id: string | null
  created_at: Date
  updated_at: Date
}
