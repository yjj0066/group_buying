import crypto from "crypto"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../modules/group-buying"
import GroupBuyingModuleService from "../modules/group-buying/service"
import {
  assertTossPaymentsOptions,
  createTossPaymentsClient,
} from "../modules/toss-payments/client"
import {
  assertStripeGroupDealOptions,
  createStripeGroupDealClient,
} from "../modules/stripe-group-deal/client"
import { resolveTossPaymentsOptionsFromEnv } from "../utils/toss-payments-options"
import { resolveStripeGroupDealOptionsFromEnv } from "../utils/stripe-group-deal-options"
import {
  resolveGroupDealPaymentProviderId,
} from "../utils/group-deal-payment-provider"
import { createGroupDealBillingCaptureService } from "../services/group-deal-billing-capture"
import {
  GroupDealBatchCaptureResult,
  GroupDealBillingAuthSession,
  GroupDealJoinSelectionInput,
  GroupDealParticipantStatus,
  GroupDealPaymentPhaseMode,
  GroupDealStatus,
} from "../types/group-buying"
import { buildParticipantKey } from "../utils/group-deal-rules"

export type PrepareGroupDealBillingReservationInput = {
  group_deal_id: string
  email: string
  quantity?: number
  selections?: GroupDealJoinSelectionInput[]
  customer_id?: string | null
}

const resolveTossPaymentsClient = () => {
  const options = resolveTossPaymentsOptionsFromEnv()

  assertTossPaymentsOptions(options)

  return createTossPaymentsClient(options)
}

const resolveStripeGroupDealClient = () => {
  const options = resolveStripeGroupDealOptionsFromEnv()

  assertStripeGroupDealOptions(options)

  return createStripeGroupDealClient(options)
}

export const emitGroupDealUpdated = async (
  container: { resolve: <T>(key: string) => T },
  groupDealId: string
) => {
  try {
    const eventBus = container.resolve(Modules.EVENT_BUS) as {
      emit: (event: { name: string; data: Record<string, unknown> }) => Promise<void>
    }

    await eventBus.emit({
      name: "group_deal.updated",
      data: { id: groupDealId },
    })
  } catch {
    // Event bus may be unavailable in isolated tests.
  }
}

const prepareGroupDealBillingReservationStep = createStep(
  "prepare-group-deal-billing-reservation",
  async (input: PrepareGroupDealBillingReservationInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    const groupDeal = await groupBuyingService.retrieveGroupDeal(
      input.group_deal_id
    )

    const paymentProviderKind =
      groupDeal.currency_code.toLowerCase() === "krw" ? "toss" : "stripe"
    const paymentProviderId = resolveGroupDealPaymentProviderId(
      paymentProviderKind === "toss" ? "kr" : "us"
    )

    const joinValidation = await groupBuyingService.validateJoinSelections({
      group_deal_id: input.group_deal_id,
      quantity: input.quantity,
      selections: input.selections,
    })

    const totalQuantity = joinValidation.totalQuantity
    const firstPaymentAmount = joinValidation.firstPaymentAmount

    const existingParticipant = await groupBuyingService.findParticipantByIdentity(
      {
        group_deal_id: input.group_deal_id,
        customer_id: input.customer_id ?? null,
        email: input.email,
      }
    )

    if (
      existingParticipant?.status === GroupDealParticipantStatus.RESERVED
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "You have already registered a billing key for this group deal"
      )
    }

    if (
      existingParticipant?.status === GroupDealParticipantStatus.CONFIRMED
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "You have already completed payment for this group deal"
      )
    }

    let participant = existingParticipant

    if (participant) {
      participant = await groupBuyingService.updateGroupDealParticipants({
        id: participant.id,
        quantity: totalQuantity,
        email: input.email,
        customer_id: input.customer_id ?? participant.customer_id,
        status: GroupDealParticipantStatus.PENDING,
        first_payment_amount: firstPaymentAmount,
        second_payment_status: joinValidation.secondPaymentStatus,
        second_payment_amount: null,
      })
    } else {
      participant = await groupBuyingService.createGroupDealParticipants({
        group_deal_id: input.group_deal_id,
        email: input.email,
        quantity: totalQuantity,
        customer_id: input.customer_id ?? null,
        status: GroupDealParticipantStatus.PENDING,
        first_payment_amount: firstPaymentAmount,
        second_payment_status: joinValidation.secondPaymentStatus,
        second_payment_amount: null,
      })
    }

    if (joinValidation.selectionSnapshots.length) {
      await groupBuyingService.replaceParticipantSelections(
        participant.id,
        joinValidation.selectionSnapshots
      )
    }

    const customerKey = buildParticipantKey({
      customer_id: input.customer_id ?? participant.customer_id,
      email: input.email,
    })
    const orderId = `gdeal_bill_${participant.id}_${crypto.randomUUID()}`

    let billingSession: GroupDealBillingAuthSession

    if (paymentProviderKind === "stripe") {
      const stripeClient = resolveStripeGroupDealClient()

      const setupSession = await stripeClient.createSetupReservationSession({
        orderId,
        amount: firstPaymentAmount,
        currencyCode: groupDeal.currency_code,
        customerEmail: input.email,
        customerKey,
      })

      await groupBuyingService.updateGroupDealParticipants({
        id: participant.id,
        billing_customer_key: customerKey,
        payment_session_id: orderId,
        payment_provider_id: paymentProviderId,
        stripe_customer_id: setupSession.stripeCustomerId,
      })

      billingSession = {
        vendor: "stripe-group-deal",
        order_id: setupSession.orderId,
        amount: setupSession.amount,
        currency_code: setupSession.currencyCode,
        client_secret: setupSession.clientSecret,
        setup_intent_id: setupSession.setupIntentId,
        stripe_customer_id: setupSession.stripeCustomerId,
        client_key: setupSession.publishableKey,
        payment_phase:
          groupDeal.payment_phase_mode ===
          GroupDealPaymentPhaseMode.SPLIT_PRODUCT_SHIPPING
            ? "first"
            : "single",
      }
    } else {
      const pgClient = resolveTossPaymentsClient()

      const billingAuth = await pgClient.createBillingAuthSession({
        customerKey,
        orderId,
        // 1차금(상품가)만 빌링키 예약 — 2차 배송비는 출고 후 별도 청구
        amount: firstPaymentAmount,
        currencyCode: groupDeal.currency_code,
        customerEmail: input.email,
      })

      await groupBuyingService.updateGroupDealParticipants({
        id: participant.id,
        billing_customer_key: customerKey,
        payment_session_id: orderId,
        payment_provider_id: paymentProviderId,
      })

      billingSession = {
        vendor: "toss-payments",
        customer_key: billingAuth.customerKey,
        order_id: billingAuth.orderId,
        amount: billingAuth.amount,
        currency_code: billingAuth.currencyCode,
        client_key: billingAuth.clientKey,
        payment_phase:
          groupDeal.payment_phase_mode ===
          GroupDealPaymentPhaseMode.SPLIT_PRODUCT_SHIPPING
            ? "first"
            : "single",
      }
    }

    return new StepResponse(
      {
        participant,
        group_deal: groupDeal,
        billing_session: billingSession,
        selections: joinValidation.selectionSnapshots,
        first_payment_amount: firstPaymentAmount,
        payment_provider_id: paymentProviderId,
        payment_provider_kind: paymentProviderKind,
      },
      {
        participant_id: participant.id,
        previous_participant: existingParticipant,
        created_participant: !existingParticipant,
      }
    )
  },
  async (
    compensation:
      | {
          participant_id: string
          previous_participant: Awaited<
            ReturnType<GroupBuyingModuleService["findParticipantByIdentity"]>
          >
          created_participant: boolean
        }
      | undefined,
    { container }
  ) => {
    if (!compensation) {
      return
    }

    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    if (compensation.created_participant) {
      await groupBuyingService.deleteGroupDealParticipants(
        compensation.participant_id
      )
      return
    }

    if (compensation.previous_participant) {
      await groupBuyingService.updateGroupDealParticipants({
        id: compensation.previous_participant.id,
        quantity: compensation.previous_participant.quantity,
        billing_customer_key: compensation.previous_participant.billing_customer_key,
        payment_session_id: compensation.previous_participant.payment_session_id,
        status: compensation.previous_participant.status,
        order_id: compensation.previous_participant.order_id,
      })
    }
  }
)

export const prepareGroupDealBillingReservationWorkflow = createWorkflow(
  "prepare-group-deal-billing-reservation",
  (input: PrepareGroupDealBillingReservationInput) => {
    const result = prepareGroupDealBillingReservationStep(input)

    return new WorkflowResponse(result)
  }
)

export type RegisterGroupDealBillingKeyInput = {
  group_deal_id: string
  participant_id: string
  billing_key: string
  billing_customer_key: string
  payment_session_id?: string | null
}

const registerGroupDealBillingKeyStep = createStep(
  "register-group-deal-billing-key",
  async (input: RegisterGroupDealBillingKeyInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )
    const billingCaptureService = createGroupDealBillingCaptureService(container)

    const participant = await groupBuyingService.retrieveGroupDealParticipant(
      input.participant_id
    )

    if (participant.group_deal_id !== input.group_deal_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Participant does not belong to this group deal"
      )
    }

    const previousStatus = participant.status
    const previousBillingCustomerKey = participant.billing_customer_key
    const previousPaymentSessionId = participant.payment_session_id

    const registration = await billingCaptureService.storeBillingKeyForParticipant(
      {
        participant_id: input.participant_id,
        billing_key: input.billing_key,
        billing_customer_key: input.billing_customer_key,
        payment_session_id: input.payment_session_id,
        payment_provider_id: participant.payment_provider_id,
      }
    )

    let captureResult: GroupDealBatchCaptureResult | null = null

    if (registration.should_capture) {
      captureResult = await billingCaptureService.captureGroupDealPayments(
        input.group_deal_id
      )
    }

    await emitGroupDealUpdated(container, input.group_deal_id)

    return new StepResponse(
      {
        participant: registration.participant,
        group_deal: registration.group_deal,
        capture_result: captureResult,
      },
      {
        participant_id: participant.id,
        previous_status: previousStatus,
        previous_billing_customer_key: previousBillingCustomerKey,
        previous_payment_session_id: previousPaymentSessionId,
        group_deal_id: input.group_deal_id,
      }
    )
  },
  async (
    compensation:
      | {
          participant_id: string
          previous_status: GroupDealParticipantStatus
          previous_billing_customer_key: string | null
          previous_payment_session_id: string | null
          group_deal_id: string
        }
      | undefined,
    { container }
  ) => {
    if (!compensation) {
      return
    }

    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    await groupBuyingService.updateGroupDealParticipants({
      id: compensation.participant_id,
      status: compensation.previous_status,
      billing_customer_key: compensation.previous_billing_customer_key,
      payment_session_id: compensation.previous_payment_session_id,
      billing_key_encrypted: null,
      stripe_customer_id: null,
      stripe_payment_method_id_encrypted: null,
      reserved_at: null,
      capture_attempts: 0,
      last_capture_error: null,
    })

    await groupBuyingService.recalculateDealMetrics(compensation.group_deal_id)
  }
)

export const registerGroupDealBillingKeyWorkflow = createWorkflow(
  "register-group-deal-billing-key",
  (input: RegisterGroupDealBillingKeyInput) => {
    const result = registerGroupDealBillingKeyStep(input)

    return new WorkflowResponse(result)
  }
)

export type RegisterGroupDealStripeSetupInput = {
  group_deal_id: string
  participant_id: string
  setup_intent_id: string
  payment_session_id?: string | null
}

const registerGroupDealStripeSetupStep = createStep(
  "register-group-deal-stripe-setup",
  async (input: RegisterGroupDealStripeSetupInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )
    const billingCaptureService = createGroupDealBillingCaptureService(container)
    const stripeClient = resolveStripeGroupDealClient()

    const participant = await groupBuyingService.retrieveGroupDealParticipant(
      input.participant_id
    )

    if (participant.group_deal_id !== input.group_deal_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Participant does not belong to this group deal"
      )
    }

    const previousStatus = participant.status
    const previousPaymentSessionId = participant.payment_session_id
    const previousStripeCustomerId = participant.stripe_customer_id

    const setupResult = await stripeClient.confirmSetupReservation({
      setupIntentId: input.setup_intent_id,
    })

    const registration =
      await billingCaptureService.storeStripePaymentMethodForParticipant({
        participant_id: input.participant_id,
        stripe_customer_id: setupResult.stripeCustomerId,
        stripe_payment_method_id: setupResult.stripePaymentMethodId,
        payment_session_id: input.payment_session_id,
        payment_provider_id: participant.payment_provider_id,
      })

    let captureResult: GroupDealBatchCaptureResult | null = null

    if (registration.should_capture) {
      captureResult = await billingCaptureService.captureGroupDealPayments(
        input.group_deal_id
      )
    }

    await emitGroupDealUpdated(container, input.group_deal_id)

    return new StepResponse(
      {
        participant: registration.participant,
        group_deal: registration.group_deal,
        capture_result: captureResult,
      },
      {
        participant_id: participant.id,
        previous_status: previousStatus,
        previous_payment_session_id: previousPaymentSessionId,
        previous_stripe_customer_id: previousStripeCustomerId,
        group_deal_id: input.group_deal_id,
      }
    )
  },
  async (
    compensation:
      | {
          participant_id: string
          previous_status: GroupDealParticipantStatus
          previous_payment_session_id: string | null
          previous_stripe_customer_id: string | null
          group_deal_id: string
        }
      | undefined,
    { container }
  ) => {
    if (!compensation) {
      return
    }

    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    await groupBuyingService.updateGroupDealParticipants({
      id: compensation.participant_id,
      status: compensation.previous_status,
      payment_session_id: compensation.previous_payment_session_id,
      stripe_customer_id: compensation.previous_stripe_customer_id,
      stripe_payment_method_id_encrypted: null,
      reserved_at: null,
      capture_attempts: 0,
      last_capture_error: null,
    })

    await groupBuyingService.recalculateDealMetrics(compensation.group_deal_id)
  }
)

export const registerGroupDealStripeSetupWorkflow = createWorkflow(
  "register-group-deal-stripe-setup",
  (input: RegisterGroupDealStripeSetupInput) => {
    const result = registerGroupDealStripeSetupStep(input)

    return new WorkflowResponse(result)
  }
)

export type CaptureGroupDealPaymentsInput = {
  group_deal_id: string
}

const captureGroupDealPaymentsStep = createStep(
  "capture-group-deal-payments",
  async (input: CaptureGroupDealPaymentsInput, { container }) => {
    const billingCaptureService = createGroupDealBillingCaptureService(container)
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    const deal = await groupBuyingService.retrieveGroupDeal(input.group_deal_id)
    const previousStatus = deal.status

    const captureResult = await billingCaptureService.captureGroupDealPayments(
      input.group_deal_id
    )

    const updatedDeal = await groupBuyingService.retrieveGroupDeal(
      input.group_deal_id
    )

    await emitGroupDealUpdated(container, input.group_deal_id)

    return new StepResponse(
      {
        group_deal: updatedDeal,
        capture_result: captureResult,
      },
      {
        group_deal_id: input.group_deal_id,
        previous_status: previousStatus,
      }
    )
  },
  async (
    compensation:
      | {
          group_deal_id: string
          previous_status: GroupDealStatus | string
        }
      | undefined,
    { container }
  ) => {
    if (!compensation) {
      return
    }

    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    await groupBuyingService.updateGroupDeals({
      id: compensation.group_deal_id,
      status: compensation.previous_status as GroupDealStatus,
    })
  }
)

export const captureGroupDealPaymentsWorkflow = createWorkflow(
  "capture-group-deal-payments",
  (input: CaptureGroupDealPaymentsInput) => {
    const result = captureGroupDealPaymentsStep(input)

    return new WorkflowResponse(result)
  }
)
