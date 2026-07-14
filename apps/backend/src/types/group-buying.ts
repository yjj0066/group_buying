export enum GroupDealStatus {
  DRAFT = "draft",
  OPEN = "open",
  MINIMUM_REACHED = "minimum_reached",
  CLOSED = "closed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum GroupDealParticipantStatus {
  PENDING = "pending",
  RESERVED = "reserved",
  CONFIRMED = "confirmed",
  CAPTURE_FAILED = "capture_failed",
  CANCELLED = "cancelled",
}

/**
 * 굿즈 옵션 유형
 * - member: 멤버 선택 (포토카드 멤버별)
 * - version: 버전/에디션 선택
 * - custom: 기타 커스텀 옵션
 */
export enum GroupDealOptionType {
  MEMBER = "member",
  VERSION = "version",
  CUSTOM = "custom",
}

/**
 * 결제 단계 모드
 * - single: 1차금(상품가)만 즉시/예약 결제 (기존 동작)
 * - split_product_shipping: 1차(상품) + 2차(배송비) 분리 결제
 */
export enum GroupDealPaymentPhaseMode {
  SINGLE = "single",
  SPLIT_PRODUCT_SHIPPING = "split_product_shipping",
}

/** 공구 전체 배송비 정산 상태 */
export enum GroupDealShippingFeeStatus {
  NOT_APPLICABLE = "not_applicable",
  PENDING_QUOTE = "pending_quote",
  QUOTED = "quoted",
  COLLECTING = "collecting",
  COMPLETED = "completed",
}

/** 참여자별 2차금(배송비) 상태 */
export enum GroupDealSecondPaymentStatus {
  NOT_REQUIRED = "not_required",
  PENDING_QUOTE = "pending_quote",
  READY = "ready",
  PAID = "paid",
  WAIVED = "waived",
}

export type GroupDealOptionDTO = {
  id: string
  group_deal_id: string
  option_type: GroupDealOptionType
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
  created_at: Date
  updated_at: Date
}

export type GroupDealParticipantSelectionDTO = {
  id: string
  participant_id: string
  option_id: string
  quantity: number
  unit_price: number
  metadata: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
}

export type GroupDealDTO = {
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
  /** 1차금 기본 단가 (옵션별 deal_price 미지정 시 fallback) */
  original_price: number
  deal_price: number
  currency_code: string
  payment_phase_mode: GroupDealPaymentPhaseMode
  shipping_fee_status: GroupDealShippingFeeStatus
  estimated_shipping_fee: number | null
  shipping_fee_note: string | null
  status: GroupDealStatus
  starts_at: Date
  ends_at: Date
  metadata: Record<string, unknown> | null
  options?: GroupDealOptionDTO[]
  created_at: Date
  updated_at: Date
}

export type GroupDealPaymentProviderKind = "toss" | "stripe"

export type GroupDealParticipantDTO = {
  id: string
  group_deal_id: string
  customer_id: string | null
  email: string
  /** selections 합계 또는 단일 수량 (하위 호환) */
  quantity: number
  status: GroupDealParticipantStatus
  cart_id: string | null
  order_id: string | null
  billing_customer_key: string | null
  payment_provider_id: string | null
  stripe_customer_id: string | null
  payment_session_id: string | null
  /** 1차금(상품가) — 빌링키 예약/캡처 시 사용 */
  first_payment_amount: number | null
  /** 2차금(배송비) — 출고 시점에 확정·청구 */
  second_payment_amount: number | null
  second_payment_status: GroupDealSecondPaymentStatus
  second_payment_order_id: string | null
  capture_attempts: number
  last_capture_error: string | null
  reserved_at: Date | null
  captured_at: Date | null
  selections?: GroupDealParticipantSelectionDTO[]
  created_at: Date
  updated_at: Date
}

export type GroupDealJoinSelectionInput = {
  option_id: string
  quantity: number
}

export type GroupDealBillingAuthSession = {
  vendor: "toss-payments" | "stripe-group-deal"
  customer_key?: string
  order_id: string
  amount: number
  currency_code: string
  /** 토스 결제위젯 clientKey */
  client_key?: string
  /** Stripe SetupIntent client_secret */
  client_secret?: string
  setup_intent_id?: string
  stripe_customer_id?: string
  /** 1차금만 포함 (2차 배송비 제외) */
  payment_phase: "first" | "single"
}

export type GroupDealCaptureResult = {
  participant_id: string
  success: boolean
  transaction_id?: string
  error?: string
  attempts: number
}

export type GroupDealBatchCaptureResult = {
  group_deal_id: string
  total: number
  succeeded: number
  failed: number
  results: GroupDealCaptureResult[]
}

/**
 * 2차금 청구 워크플로 입력 (향후 구현)
 * @see workflows/group-deal-second-payment.ts
 */
export type GroupDealSecondPaymentInput = {
  group_deal_id: string
  participant_ids?: string[]
  /** 관리자가 확정한 개별 배송비. 미지정 시 deal.estimated_shipping_fee 사용 */
  shipping_fee_override?: number | null
}
