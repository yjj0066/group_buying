import {
  GroupDealPaymentPhaseMode,
  GroupDealSecondPaymentStatus,
  GroupDealShippingFeeStatus,
} from "../types/group-buying"

export type GroupDealPaymentContextLike = {
  payment_phase_mode?: GroupDealPaymentPhaseMode | string
  shipping_fee_status?: GroupDealShippingFeeStatus | string
  estimated_shipping_fee?: number | string | null
}

export type GroupDealParticipantPaymentLike = {
  first_payment_amount?: number | string | null
  second_payment_amount?: number | string | null
  second_payment_status?: GroupDealSecondPaymentStatus | string
  quantity?: number
}

/**
 * K-POP 해외 굿즈 공구 결제 구조
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │ 1차금 (상품가)                                               │
 * │ - 참여 시 빌링키 예약 또는 목표 달성 시 캡처                    │
 * │ - 옵션/멤버별 unit_price × quantity 합계                       │
 * │ - first_payment_amount 필드에 스냅샷 저장                      │
 * └─────────────────────────────────────────────────────────────┘
 *                              ↓
 *                    [제작·입고·출고 준비]
 *                              ↓
 * ┌─────────────────────────────────────────────────────────────┐
 * │ 2차금 (배송비) — payment_phase_mode = split_product_shipping │
 * │ - 출고 시점에 무게/지역 기준 배송비 확정                        │
 * │ - deal.shipping_fee_status: pending_quote → quoted → collecting│
 * │ - participant.second_payment_status: pending_quote → ready     │
 * │ - 별도 주문(second_payment_order_id) 또는 빌링키 2차 캡처        │
 * │ @see workflows/group-deal-second-payment.ts (향후 구현)        │
 * └─────────────────────────────────────────────────────────────┘
 */

/** 1차금만 결제하는 모드인지 확인 */
export const isSplitPaymentDeal = (
  deal: GroupDealPaymentContextLike
): boolean => {
  return (
    deal.payment_phase_mode === GroupDealPaymentPhaseMode.SPLIT_PRODUCT_SHIPPING
  )
}

/** 참여자 생성 시 2차금 초기 상태 결정 */
export const resolveInitialSecondPaymentStatus = (
  deal: GroupDealPaymentContextLike
): GroupDealSecondPaymentStatus => {
  if (!isSplitPaymentDeal(deal)) {
    return GroupDealSecondPaymentStatus.NOT_REQUIRED
  }

  if (deal.estimated_shipping_fee != null) {
    return GroupDealSecondPaymentStatus.READY
  }

  return GroupDealSecondPaymentStatus.PENDING_QUOTE
}

/** 공구 생성/수정 시 배송비 상태 기본값 */
export const resolveInitialShippingFeeStatus = (
  deal: GroupDealPaymentContextLike
): GroupDealShippingFeeStatus => {
  if (!isSplitPaymentDeal(deal)) {
    return GroupDealShippingFeeStatus.NOT_APPLICABLE
  }

  if (deal.estimated_shipping_fee != null) {
    return GroupDealShippingFeeStatus.QUOTED
  }

  return GroupDealShippingFeeStatus.PENDING_QUOTE
}

/**
 * 2차금 예상 금액 (견적 단계)
 * 실제 청구는 출고 후 관리자 확정 → collectSecondPaymentsWorkflow
 */
export const estimateSecondPaymentAmount = (input: {
  deal: GroupDealPaymentContextLike
  participant: GroupDealParticipantPaymentLike
}): number | null => {
  if (!isSplitPaymentDeal(input.deal)) {
    return null
  }

  if (input.participant.second_payment_amount != null) {
    return Number(input.participant.second_payment_amount)
  }

  if (input.deal.estimated_shipping_fee == null) {
    return null
  }

  // 기본: 1인당 고정 배송비. 향후 quantity/지역/무게 가중치 확장 가능
  return Number(input.deal.estimated_shipping_fee)
}

/**
 * 빌링키 캡처에 사용할 금액 — 항상 1차금만
 * (2차 배송비는 별도 워크플로에서 처리)
 */
export const resolveBillingCaptureAmount = (input: {
  participant: GroupDealParticipantPaymentLike
  deal: GroupDealPaymentContextLike
  fallbackUnitPrice: number
}): number => {
  if (input.participant.first_payment_amount != null) {
    return Number(input.participant.first_payment_amount)
  }

  return input.fallbackUnitPrice * Number(input.participant.quantity ?? 1)
}

/**
 * 2차금 청구 가능 여부
 * - 공구가 split 모드
 * - 1차금 결제 완료(confirmed)
 * - second_payment_status === ready
 */
export const canCollectSecondPayment = (input: {
  deal: GroupDealPaymentContextLike
  second_payment_status: GroupDealSecondPaymentStatus | string
  first_payment_completed: boolean
}): boolean => {
  return (
    isSplitPaymentDeal(input.deal) &&
    input.first_payment_completed &&
    input.second_payment_status === GroupDealSecondPaymentStatus.READY
  )
}
