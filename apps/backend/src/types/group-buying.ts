export enum GroupDealStatus {
  DRAFT = "draft",
  OPEN = "open",
  MINIMUM_REACHED = "minimum_reached",
  CLOSED = "closed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  /** 모든 참여자 수령 확인 후 최종 정산 완료 */
  SETTLED = "settled",
}

/** 총대 1차 구매 영수증 인증 상태 */
export enum GroupDealReceiptStatus {
  PENDING = "pending",
  UPLOADED = "uploaded",
  VERIFIED = "verified",
  REJECTED = "rejected",
}

/** 총대(리더) 보증금 예치 상태 */
export enum GroupDealDepositStatus {
  PENDING = "pending",
  DEPOSITED = "deposited",
  REFUNDED = "refunded",
}

/** 공석 대기(waitlist) 상태 */
export enum GroupDealWaitlistStatus {
  WAITING = "waiting",
  MATCHED = "matched",
  EXPIRED = "expired",
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
  /** 총대(리더) customer id */
  leader_customer_id: string | null
  /** 총대 보증금 예치 상태 */
  deposit_status: GroupDealDepositStatus
  /** 총대 보증금 금액 */
  deposit_amount: number | null
  /** 총대 1차 구매 영수증 URL */
  purchase_receipt_url: string | null
  /** 총대 1차 구매 영수증 인증 상태 */
  purchase_receipt_status: GroupDealReceiptStatus
  purchase_receipt_verified_at: Date | null
  status: GroupDealStatus
  starts_at: Date
  ends_at: Date
  metadata: Record<string, unknown> | null
  options?: GroupDealOptionDTO[]
  created_at: Date
  updated_at: Date
}

export type GroupDealWaitlistEntryDTO = {
  id: string
  group_deal_id: string
  customer_id: string | null
  email: string
  quantity: number
  queue_position: number
  priority: number
  status: GroupDealWaitlistStatus
  payment_deadline: Date | null
  matched_participant_id: string | null
  matched_at: Date | null
  selections_snapshot: GroupDealJoinSelectionInput[] | null
  metadata: Record<string, unknown> | null
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
  /** 입금/결제 기한 (미결제 시 공석 처리) */
  payment_deadline: Date | null
  /** 수령 확인 시각 (정산 조건) */
  delivery_confirmed_at: Date | null
  /** 대기자 매칭으로 생성된 경우 원 waitlist entry id */
  waitlist_entry_id: string | null
  /** 송장 번호 */
  tracking_number: string | null
  /** 택배사 */
  carrier: string | null
  tracking_updated_at: Date | null
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

export type GroupDealEscrowReleaseResult = {
  participant_id: string
  previous_status: GroupDealParticipantStatus
  action: "reservation_released" | "payment_refunded" | "skipped"
  success: boolean
  error?: string
}

export type GroupDealDepositRefundResult = {
  group_deal_id: string
  deposit_status: GroupDealDepositStatus
  refunded: boolean
  error?: string
}

export type GroupDealWaitlistMatchResult = {
  matched: boolean
  waitlist_entry_id?: string
  participant_id?: string
  email?: string
  payment_deadline?: Date
}

export type GroupDealSettlementResult = {
  group_deal_id: string
  capture_result: GroupDealBatchCaptureResult | null
  deposit_refund: GroupDealDepositRefundResult
  status: GroupDealStatus
}

export type GroupDealPackingSlipRow = {
  participant_id: string
  email: string
  customer_id: string | null
  quantity: number
  status: GroupDealParticipantStatus
  order_id: string | null
  recipient_name: string | null
  phone: string | null
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  province: string | null
  postal_code: string | null
  country_code: string | null
  tracking_number: string | null
  carrier: string | null
  option_summary: string | null
}

export type GroupDealPackingSlip = {
  group_deal_id: string
  title: string
  generated_at: string
  total_rows: number
  rows: GroupDealPackingSlipRow[]
}
