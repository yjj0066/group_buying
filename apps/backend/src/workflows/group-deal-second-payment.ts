import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../modules/group-buying"
import GroupBuyingModuleService from "../modules/group-buying/service"
import {
  GroupDealPaymentPhaseMode,
  GroupDealSecondPaymentStatus,
  GroupDealShippingFeeStatus,
} from "../types/group-buying"
import {
  canCollectSecondPayment,
  estimateSecondPaymentAmount,
  isSplitPaymentDeal,
} from "../utils/group-deal-payment-phases"

export type CollectGroupDealSecondPaymentsInput = {
  group_deal_id: string
  participant_ids?: string[]
  /** 관리자 확정 1인당 배송비. 미지정 시 deal.estimated_shipping_fee 사용 */
  shipping_fee_override?: number | null
}

/**
 * 2차금(배송비) 일괄 청구 워크플로 — 구조적 스켈레톤
 *
 * 향후 구현 단계:
 * 1. 관리자가 출고 후 배송비 확정 (POST /admin/group-deals/:id/quote-shipping)
 * 2. participant.second_payment_status → ready, second_payment_amount 설정
 * 3. 이 워크플로 실행:
 *    a. 저장된 빌링키로 2차 캡처 (또는 별도 결제 링크/주문 생성)
 *    b. second_payment_order_id 기록
 *    c. second_payment_status → paid
 * 4. deal.shipping_fee_status → completed
 *
 * @see utils/group-deal-payment-phases.ts
 */
const collectGroupDealSecondPaymentsStep = createStep(
  "collect-group-deal-second-payments",
  async (input: CollectGroupDealSecondPaymentsInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    const deal = await groupBuyingService.retrieveGroupDeal(input.group_deal_id)

    if (!isSplitPaymentDeal(deal)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "This group deal does not use split product/shipping payments"
      )
    }

    const shippingFee =
      input.shipping_fee_override ?? deal.estimated_shipping_fee ?? null

    if (shippingFee == null) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Shipping fee must be quoted before collecting second payments"
      )
    }

    const participants = await groupBuyingService.listConfirmedParticipants(
      input.group_deal_id
    )

    const targets = participants.filter((participant) => {
      if (
        input.participant_ids?.length &&
        !input.participant_ids.includes(participant.id)
      ) {
        return false
      }

      return canCollectSecondPayment({
        deal,
        second_payment_status:
          participant.second_payment_status as GroupDealSecondPaymentStatus,
        first_payment_completed: true,
      })
    })

    /**
     * TODO: PG 2차 캡처 연동
     *
     * for (const participant of targets) {
     *   const amount = estimateSecondPaymentAmount({ deal, participant }) ?? shippingFee
     *   await billingCaptureService.captureSecondPayment({ participant, amount })
     *   await groupBuyingService.updateGroupDealParticipants({
     *     id: participant.id,
     *     second_payment_status: GroupDealSecondPaymentStatus.PAID,
     *     second_payment_amount: amount,
     *     second_payment_order_id: captureResult.transactionId,
     *   })
     * }
     */

    const preview = targets.map((participant) => ({
      participant_id: participant.id,
      email: participant.email,
      estimated_amount:
        estimateSecondPaymentAmount({ deal, participant }) ?? Number(shippingFee),
      current_status: participant.second_payment_status,
      // 실제 청구 전까지 ready 유지
      next_status: GroupDealSecondPaymentStatus.READY,
    }))

    return new StepResponse({
      group_deal_id: input.group_deal_id,
      shipping_fee: Number(shippingFee),
      eligible_count: targets.length,
      preview,
      message:
        "Second payment collection structure is ready. Connect PG capture in collectGroupDealSecondPaymentsStep.",
    })
  }
)

export const collectGroupDealSecondPaymentsWorkflow = createWorkflow(
  "collect-group-deal-second-payments",
  (input: CollectGroupDealSecondPaymentsInput) => {
    const result = collectGroupDealSecondPaymentsStep(input)

    return new WorkflowResponse(result)
  }
)

export type QuoteGroupDealShippingInput = {
  group_deal_id: string
  estimated_shipping_fee: number
  shipping_fee_note?: string | null
}

/**
 * 2차금 견적 확정 — 관리자가 1인당 배송비를 확정하면 참여자 상태를 ready로 전환
 */
const quoteGroupDealShippingStep = createStep(
  "quote-group-deal-shipping",
  async (input: QuoteGroupDealShippingInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    const deal = await groupBuyingService.retrieveGroupDeal(input.group_deal_id)

    if (!isSplitPaymentDeal(deal)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Shipping quote applies only to split payment deals"
      )
    }

    await groupBuyingService.updateGroupDeals({
      id: input.group_deal_id,
      estimated_shipping_fee: input.estimated_shipping_fee,
      shipping_fee_note: input.shipping_fee_note ?? null,
      shipping_fee_status: GroupDealShippingFeeStatus.QUOTED,
    })

    const updatedCount = await groupBuyingService.markSecondPaymentReady({
      group_deal_id: input.group_deal_id,
      shipping_fee_per_participant: input.estimated_shipping_fee,
    })

    return new StepResponse({
      group_deal_id: input.group_deal_id,
      participants_updated: updatedCount,
      estimated_shipping_fee: input.estimated_shipping_fee,
    })
  }
)

export const quoteGroupDealShippingWorkflow = createWorkflow(
  "quote-group-deal-shipping",
  (input: QuoteGroupDealShippingInput) => {
    const result = quoteGroupDealShippingStep(input)

    return new WorkflowResponse(result)
  }
)
