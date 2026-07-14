import type { Logger } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../modules/group-buying"
import GroupBuyingModuleService from "../modules/group-buying/service"
import {
  assertStripeGroupDealOptions,
  createStripeGroupDealClient,
} from "../modules/stripe-group-deal/client"
import {
  assertTossPaymentsOptions,
  createTossPaymentsClient,
} from "../modules/toss-payments/client"
import {
  GroupDealDepositStatus,
  GroupDealDepositRefundResult,
  GroupDealEscrowReleaseResult,
  GroupDealParticipantStatus,
} from "../types/group-buying"
import { resolvePaymentProviderKindFromId } from "../utils/group-deal-payment-provider"
import { resolveStripeGroupDealOptionsFromEnv } from "../utils/stripe-group-deal-options"
import { resolveTossPaymentsOptionsFromEnv } from "../utils/toss-payments-options"

export class GroupDealEscrowService {
  protected readonly groupBuyingService_: GroupBuyingModuleService
  protected readonly logger_: Logger
  protected readonly tossClient_ = createTossPaymentsClient(
    resolveTossPaymentsOptionsFromEnv()
  )
  protected readonly stripeClient_ = createStripeGroupDealClient(
    resolveStripeGroupDealOptionsFromEnv()
  )

  constructor(
    container: {
      resolve: <T>(key: string) => T
      logger?: Logger
    }
  ) {
    assertTossPaymentsOptions(resolveTossPaymentsOptionsFromEnv())
    assertStripeGroupDealOptions(resolveStripeGroupDealOptionsFromEnv())

    this.groupBuyingService_ = container.resolve(GROUP_BUYING_MODULE)
    this.logger_ = container.logger ?? console
  }

  async releaseParticipantEscrow(
    participantId: string
  ): Promise<GroupDealEscrowReleaseResult> {
    const participant =
      await this.groupBuyingService_.retrieveGroupDealParticipant(
        participantId
      )
    const previousStatus = participant.status as GroupDealParticipantStatus

    if (previousStatus === GroupDealParticipantStatus.CANCELLED) {
      return {
        participant_id: participantId,
        previous_status: previousStatus,
        action: "skipped",
        success: true,
      }
    }

    if (previousStatus === GroupDealParticipantStatus.PENDING) {
      await this.groupBuyingService_.cancelParticipantSlot({
        participant_id: participantId,
        reason: "payment_not_completed",
      })

      return {
        participant_id: participantId,
        previous_status: previousStatus,
        action: "reservation_released",
        success: true,
      }
    }

    if (previousStatus === GroupDealParticipantStatus.RESERVED) {
      await this.releaseReservedParticipant(participant)

      return {
        participant_id: participantId,
        previous_status: previousStatus,
        action: "reservation_released",
        success: true,
      }
    }

    if (previousStatus === GroupDealParticipantStatus.CONFIRMED) {
      try {
        await this.refundConfirmedParticipant(participant)

        await this.groupBuyingService_.cancelParticipantSlot({
          participant_id: participantId,
          reason: "deal_cancelled_or_failed",
        })

        return {
          participant_id: participantId,
          previous_status: previousStatus,
          action: "payment_refunded",
          success: true,
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Refund request failed"

        return {
          participant_id: participantId,
          previous_status: previousStatus,
          action: "payment_refunded",
          success: false,
          error: message,
        }
      }
    }

    return {
      participant_id: participantId,
      previous_status: previousStatus,
      action: "skipped",
      success: true,
    }
  }

  async releaseAllParticipantEscrows(groupDealId: string) {
    const participants = await this.groupBuyingService_.listGroupDealParticipants(
      {
        group_deal_id: groupDealId,
      }
    )

    const results: GroupDealEscrowReleaseResult[] = []

    for (const participant of participants) {
      if (participant.status === GroupDealParticipantStatus.CANCELLED) {
        continue
      }

      results.push(await this.releaseParticipantEscrow(participant.id))
    }

    await this.groupBuyingService_.recalculateDealMetrics(groupDealId)

    return results
  }

  async refundLeaderDeposit(groupDealId: string): Promise<GroupDealDepositRefundResult> {
    const deal = await this.groupBuyingService_.retrieveGroupDeal(groupDealId)

    if (deal.deposit_status !== GroupDealDepositStatus.DEPOSITED) {
      return {
        group_deal_id: groupDealId,
        deposit_status: deal.deposit_status as GroupDealDepositStatus,
        refunded: deal.deposit_status === GroupDealDepositStatus.REFUNDED,
      }
    }

    if (!deal.deposit_payment_key || deal.deposit_amount == null) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Group deal ${groupDealId} is missing leader deposit payment data`
      )
    }

    try {
      if (deal.currency_code.toLowerCase() === "krw") {
        await this.tossClient_.refundPayment({
          orderId: `gdeal_deposit_${groupDealId}`,
          paymentKey: deal.deposit_payment_key,
          amount: Number(deal.deposit_amount),
          reason: "leader_deposit_refund",
        })
      } else {
        await this.stripeClient_.refundCapturedPayment({
          paymentIntentId: deal.deposit_payment_key,
          amount: Number(deal.deposit_amount),
          currencyCode: deal.currency_code,
          reason: "leader_deposit_refund",
        })
      }

      await this.groupBuyingService_.markLeaderDepositRefunded(groupDealId)

      return {
        group_deal_id: groupDealId,
        deposit_status: GroupDealDepositStatus.REFUNDED,
        refunded: true,
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Leader deposit refund failed"

      this.logger_.error(
        `[group-deal-escrow] Leader deposit refund failed for ${groupDealId}: ${message}`
      )

      return {
        group_deal_id: groupDealId,
        deposit_status: GroupDealDepositStatus.DEPOSITED,
        refunded: false,
        error: message,
      }
    }
  }

  protected async releaseReservedParticipant(participant: {
    id: string
    group_deal_id: string
    payment_provider_id?: string | null
    payment_session_id?: string | null
    stripe_customer_id?: string | null
    billing_key_encrypted?: string | null
    stripe_payment_method_id_encrypted?: string | null
  }) {
    const providerKind = resolvePaymentProviderKindFromId(
      participant.payment_provider_id
    )

    if (providerKind === "stripe" && participant.payment_session_id) {
      try {
        if (participant.payment_session_id.startsWith("seti_")) {
          await this.stripeClient_.cancelSetupReservation({
            setupIntentId: participant.payment_session_id,
          })
        }
      } catch (error) {
        this.logger_.warn(
          `[group-deal-escrow] Stripe setup cancel skipped for participant ${participant.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }

    await this.groupBuyingService_.updateGroupDealParticipants({
      id: participant.id,
      status: GroupDealParticipantStatus.CANCELLED,
      billing_key_encrypted: null,
      billing_customer_key: null,
      stripe_customer_id: null,
      stripe_payment_method_id_encrypted: null,
      payment_session_id: null,
      reserved_at: null,
    })

    await this.groupBuyingService_.recalculateDealMetrics(
      participant.group_deal_id
    )
  }

  protected async refundConfirmedParticipant(participant: {
    id: string
    group_deal_id: string
    payment_provider_id?: string | null
    capture_payment_key?: string | null
    order_id?: string | null
    payment_session_id?: string | null
  }) {
    const deal = await this.groupBuyingService_.retrieveGroupDeal(
      participant.group_deal_id
    )
    const paymentKey =
      participant.capture_payment_key ??
      participant.order_id ??
      participant.payment_session_id

    if (!paymentKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Participant ${participant.id} has no captured payment reference`
      )
    }

    const amount =
      await this.groupBuyingService_.getParticipantFirstPaymentAmount(
        participant.id
      )

    const providerKind = resolvePaymentProviderKindFromId(
      participant.payment_provider_id
    )

    if (providerKind === "stripe") {
      await this.stripeClient_.refundCapturedPayment({
        paymentIntentId: paymentKey,
        amount,
        currencyCode: deal.currency_code,
        reason: "group_deal_cancel_or_fail",
      })
    } else {
      await this.tossClient_.refundPayment({
        orderId: participant.payment_session_id ?? `gdeal_refund_${participant.id}`,
        paymentKey,
        amount,
        reason: "group_deal_cancel_or_fail",
      })
    }
  }
}

export const createGroupDealEscrowService = (container: {
  resolve: <T>(key: string) => T
  logger?: Logger
}) => new GroupDealEscrowService(container)
