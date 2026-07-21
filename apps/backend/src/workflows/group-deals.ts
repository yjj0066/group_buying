import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  addToCartWorkflow,
  createCartWorkflow,
  updateCartWorkflow,
} from "@medusajs/medusa/core-flows"
import { GROUP_BUYING_MODULE } from "../modules/group-buying"
import GroupBuyingModuleService from "../modules/group-buying/service"
import { createGroupDealBillingCaptureService } from "../services/group-deal-billing-capture"
import {
  GroupDealJoinSelectionInput,
  GroupDealOptionType,
  GroupDealParticipantStatus,
  GroupDealPaymentPhaseMode,
  GroupDealDepositStatus,
  GroupDealStatus,
} from "../types/group-buying"
import {
  buildParticipantKey,
} from "../utils/group-deal-rules"
import { resolveInitialShippingFeeStatus } from "../utils/group-deal-payment-phases"
import { extractBillingPaymentFromOrder } from "../utils/group-deal-checkout-payment"
import {
  assertDealDeletable,
  assertDealUpdatable,
  assertStatusTransitionAllowed,
  validateDealSchedule,
} from "../utils/group-deal-admin-rules"
import {
  resolveGroupDealPaymentProviderId,
  resolveGroupDealPaymentProviderKind,
} from "../utils/group-deal-payment-provider"
import { captureGroupDealPaymentsWorkflow, emitGroupDealUpdated } from "./group-deal-billing"
import { refundGroupDealEscrowWorkflow } from "./group-deal-escrow"

export type CreateGroupDealOptionInput = {
  option_type: GroupDealOptionType
  option_key: string
  label: string
  deal_price?: number | null
  original_price?: number | null
  max_quantity?: number | null
  target_quantity?: number | null
  sort_order?: number
  metadata?: Record<string, unknown> | null
}

export type CreateGroupDealStepInput = {
  title: string
  description?: string | null
  product_id: string
  variant_id?: string | null
  min_participants: number
  target_quantity: number
  max_quantity?: number | null
  original_price: number
  deal_price: number
  currency_code: string
  starts_at: string
  ends_at: string
  status?: GroupDealStatus
  metadata?: Record<string, unknown> | null
  payment_phase_mode?: GroupDealPaymentPhaseMode
  estimated_shipping_fee?: number | null
  shipping_fee_note?: string | null
  leader_customer_id?: string | null
  deposit_amount?: number | null
  deposit_status?: GroupDealDepositStatus
  options?: CreateGroupDealOptionInput[]
}

export const createGroupDealStep = createStep(
  "create-group-deal",
  async (input: CreateGroupDealStepInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    const paymentPhaseMode =
      input.payment_phase_mode ?? GroupDealPaymentPhaseMode.SINGLE

    const groupDeal = await groupBuyingService.createGroupDeals({
      title: input.title,
      description: input.description ?? null,
      product_id: input.product_id,
      variant_id: input.variant_id ?? null,
      min_participants: input.min_participants,
      target_quantity: input.target_quantity,
      max_quantity: input.max_quantity ?? input.target_quantity,
      original_price: input.original_price,
      deal_price: input.deal_price,
      currency_code: input.currency_code,
      metadata: input.metadata ?? null,
      current_quantity: 0,
      current_participants: 0,
      starts_at: new Date(input.starts_at),
      ends_at: new Date(input.ends_at),
      status: input.status ?? GroupDealStatus.DRAFT,
      payment_phase_mode: paymentPhaseMode,
      estimated_shipping_fee: input.estimated_shipping_fee ?? null,
      shipping_fee_note: input.shipping_fee_note ?? null,
      shipping_fee_status: resolveInitialShippingFeeStatus({
        payment_phase_mode: paymentPhaseMode,
        estimated_shipping_fee: input.estimated_shipping_fee ?? null,
      }),
      leader_customer_id: input.leader_customer_id ?? null,
      deposit_amount: input.deposit_amount ?? null,
      deposit_status: input.deposit_status ?? GroupDealDepositStatus.PENDING,
    })

    if (input.options?.length) {
      await groupBuyingService.createGroupDealOptions(
        input.options.map((option, index) => ({
          group_deal_id: groupDeal.id,
          option_type: option.option_type,
          option_key: option.option_key,
          label: option.label,
          deal_price: option.deal_price ?? null,
          original_price: option.original_price ?? null,
          max_quantity: option.max_quantity ?? null,
          target_quantity: option.target_quantity ?? null,
          sort_order: option.sort_order ?? index,
          metadata: option.metadata ?? null,
          current_quantity: 0,
          is_active: true,
        }))
      )
    }

    const refreshedDeal = await groupBuyingService.retrieveGroupDeal(groupDeal.id)

    return new StepResponse(refreshedDeal, groupDeal.id)
  },
  async (id: string | undefined, { container }) => {
    if (!id) {
      return
    }

    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    await groupBuyingService.deleteGroupDeals(id)
  }
)

export const createGroupDealWorkflow = createWorkflow(
  "create-group-deal",
  (input: CreateGroupDealStepInput) => {
    const groupDeal = createGroupDealStep(input)

    return new WorkflowResponse(groupDeal)
  }
)

export type PrepareGroupDealCheckoutInput = {
  group_deal_id: string
  email: string
  quantity?: number
  selections?: GroupDealJoinSelectionInput[]
  region_id: string
  customer_id?: string | null
  cart_id?: string | null
}

const prepareGroupDealCheckoutStep = createStep(
  "prepare-group-deal-checkout",
  async (input: PrepareGroupDealCheckoutInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const joinValidation = await groupBuyingService.validateJoinSelections({
      group_deal_id: input.group_deal_id,
      quantity: input.quantity,
      selections: input.selections,
    })

    const groupDeal = joinValidation.deal
    const totalQuantity = joinValidation.totalQuantity
    const firstPaymentAmount = joinValidation.firstPaymentAmount

    let variantId = groupDeal.variant_id

    if (!variantId && groupDeal.product_id) {
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "variants.id"],
        filters: { id: groupDeal.product_id },
      })

      const resolvedVariantId = (
        products?.[0] as { variants?: Array<{ id?: string }> } | undefined
      )?.variants?.[0]?.id

      if (resolvedVariantId) {
        variantId = String(resolvedVariantId)
      }
    }

    if (!variantId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Group deal is missing a product variant"
      )
    }

    const {
      data: [variant],
    } = await query.graph(
      {
        entity: "product_variant",
        fields: ["id", "product_id", "manage_inventory", "inventory_quantity"],
        filters: { id: variantId },
      },
      { throwIfKeyNotFound: true }
    )

    const {
      data: [region],
    } = await query.graph({
      entity: "region",
      fields: ["id", "countries.iso_2"],
      filters: { id: input.region_id },
    })

    const regionCountryCode = String(
      (region?.countries as Array<{ iso_2?: string }> | undefined)?.[0]?.iso_2 ??
        ""
    ).toLowerCase()
    const paymentProviderId = resolveGroupDealPaymentProviderId(regionCountryCode)
    const paymentProviderKind = resolveGroupDealPaymentProviderKind(regionCountryCode)

    let cartId = input.cart_id ?? null

    if (!cartId) {
      const { result: createdCart } = await createCartWorkflow(container).run({
        input: {
          region_id: input.region_id,
          email: input.email,
          customer_id: input.customer_id ?? undefined,
        },
      })

      cartId = createdCart.id
    }

    const billingCustomerKey = buildParticipantKey({
      customer_id: input.customer_id,
      email: input.email,
    })
    const paymentDeadline = await groupBuyingService.resolvePaymentDeadline()

    const existingParticipant = await groupBuyingService.findParticipantByIdentity(
      {
        group_deal_id: input.group_deal_id,
        customer_id: input.customer_id ?? null,
        email: input.email,
      }
    )

    let participant = existingParticipant

    if (
      participant &&
      participant.status === GroupDealParticipantStatus.CONFIRMED
    ) {
      participant = await groupBuyingService.createGroupDealParticipants({
        group_deal_id: input.group_deal_id,
        email: input.email,
        quantity: totalQuantity,
        customer_id: input.customer_id ?? participant.customer_id,
        cart_id: cartId,
        status: GroupDealParticipantStatus.PENDING,
        first_payment_amount: firstPaymentAmount,
        second_payment_status: joinValidation.secondPaymentStatus,
        payment_provider_id: paymentProviderId,
        payment_deadline: paymentDeadline,
      })
    } else if (participant) {
      participant = await groupBuyingService.updateGroupDealParticipants({
        id: participant.id,
        quantity: totalQuantity,
        email: input.email,
        customer_id: input.customer_id ?? participant.customer_id,
        cart_id: cartId,
        status: GroupDealParticipantStatus.PENDING,
        first_payment_amount: firstPaymentAmount,
        second_payment_status: joinValidation.secondPaymentStatus,
        billing_customer_key: billingCustomerKey,
        payment_provider_id: paymentProviderId,
        payment_deadline: paymentDeadline,
      })
    } else {
      participant = await groupBuyingService.createGroupDealParticipants({
        group_deal_id: input.group_deal_id,
        email: input.email,
        quantity: totalQuantity,
        customer_id: input.customer_id ?? null,
        cart_id: cartId,
        status: GroupDealParticipantStatus.PENDING,
        first_payment_amount: firstPaymentAmount,
        second_payment_status: joinValidation.secondPaymentStatus,
        billing_customer_key: billingCustomerKey,
        payment_provider_id: paymentProviderId,
        payment_deadline: paymentDeadline,
      })
    }

    if (joinValidation.selectionSnapshots.length) {
      await groupBuyingService.replaceParticipantSelections(
        participant.id,
        joinValidation.selectionSnapshots
      )
    }

    await updateCartWorkflow(container).run({
      input: {
        id: cartId,
        metadata: {
          group_deal_billing_reservation: true,
          group_deal_id: groupDeal.id,
          participant_id: participant.id,
          billing_customer_key: billingCustomerKey,
          payment_provider_id: paymentProviderId,
        },
      },
    })

    await addToCartWorkflow(container).run({
      input: {
        cart_id: cartId,
        items: [
          {
            variant_id: variant.id,
            quantity: totalQuantity,
            unit_price: Number(groupDeal.deal_price),
            metadata: {
              group_deal_id: groupDeal.id,
              participant_id: participant.id,
              group_deal_title: groupDeal.title,
              is_group_deal: true,
            },
          },
        ],
      },
    })

    return new StepResponse(
      {
        cart_id: cartId,
        participant,
        group_deal: groupDeal,
        first_payment_amount: firstPaymentAmount,
        billing_mode: "reservation" as const,
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
        cart_id: compensation.previous_participant.cart_id,
        status: compensation.previous_participant.status,
        order_id: compensation.previous_participant.order_id,
      })
    }
  }
)

export const prepareGroupDealCheckoutWorkflow = createWorkflow(
  "prepare-group-deal-checkout",
  (input: PrepareGroupDealCheckoutInput) => {
    const result = prepareGroupDealCheckoutStep(input)

    return new WorkflowResponse(result)
  }
)

export type ConfirmGroupDealParticipationInput = {
  order_id: string
}

type ConfirmGroupDealParticipationCompensation = Array<{
  participant_id: string
  previous_status: GroupDealParticipantStatus
  previous_quantity: number
  previous_order_id: string | null
  previous_billing_customer_key: string | null
  previous_payment_session_id: string | null
  had_billing_key: boolean
}>

type ConfirmGroupDealParticipationOutput = {
  updated_deals: string[]
  captured_deals: string[]
  billing_reservation: boolean
}

const confirmGroupDealParticipationStep = createStep(
  "confirm-group-deal-participation",
  async (input: ConfirmGroupDealParticipationInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )
    const billingCaptureService = createGroupDealBillingCaptureService(container)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data = [] } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "email",
        "customer_id",
        "items.id",
        "items.quantity",
        "items.metadata",
        "payment_collections.payment_sessions.id",
        "payment_collections.payment_sessions.provider_id",
        "payment_collections.payment_sessions.status",
        "payment_collections.payment_sessions.data",
        "payment_collections.payments.id",
        "payment_collections.payments.provider_id",
        "payment_collections.payments.data",
      ],
      filters: { id: input.order_id },
    })

    const order = data[0]

    if (!order?.items?.length) {
      return new StepResponse<
        ConfirmGroupDealParticipationOutput,
        ConfirmGroupDealParticipationCompensation
      >(
        {
          updated_deals: [],
          captured_deals: [],
          billing_reservation: false,
        },
        []
      )
    }

    const billingPayment = extractBillingPaymentFromOrder(
      order as Parameters<typeof extractBillingPaymentFromOrder>[0]
    )
    const updatedDealIds = new Set<string>()
    const dealsToCapture = new Set<string>()
    const compensation: ConfirmGroupDealParticipationCompensation = []

    for (const item of order.items) {
      if (!item) {
        continue
      }

      const metadata = (item.metadata ?? {}) as Record<string, unknown>
      const groupDealId = metadata.group_deal_id as string | undefined
      const participantId = metadata.participant_id as string | undefined

      if (!groupDealId || !participantId) {
        continue
      }

      const participant = await groupBuyingService.retrieveGroupDealParticipant(
        participantId
      )

      if (
        participant.status === GroupDealParticipantStatus.CONFIRMED &&
        participant.order_id === order.id
      ) {
        continue
      }

      if (
        participant.status === GroupDealParticipantStatus.RESERVED &&
        participant.order_id === order.id
      ) {
        continue
      }

      const identityParticipant =
        await groupBuyingService.findParticipantByIdentity({
          group_deal_id: groupDealId,
          customer_id: order.customer_id ?? participant.customer_id,
          email: order.email ?? participant.email,
        })

      const quantityToAdd = item.quantity ?? participant.quantity

      compensation.push({
        participant_id: participant.id,
        previous_status: participant.status,
        previous_quantity: participant.quantity,
        previous_order_id: participant.order_id,
        previous_billing_customer_key: participant.billing_customer_key,
        previous_payment_session_id: participant.payment_session_id,
        had_billing_key: Boolean(participant.billing_key_encrypted),
      })

      if (
        identityParticipant &&
        identityParticipant.id !== participant.id &&
        identityParticipant.status === GroupDealParticipantStatus.CONFIRMED
      ) {
        await groupBuyingService.updateGroupDealParticipants({
          id: identityParticipant.id,
          quantity: identityParticipant.quantity + quantityToAdd,
          order_id: order.id,
        })

        if (participant.status === GroupDealParticipantStatus.PENDING) {
          await groupBuyingService.deleteGroupDealParticipants(participant.id)
        }
      } else if (
        billingPayment?.mode === "billing_reservation" &&
        billingPayment.billingKey &&
        billingPayment.customerKey
      ) {
        /**
         * v2 체크아웃 + Korean PG 빌링키 예약:
         * min_participants 달성 전까지 RESERVED(가승인) 상태로 유지하고
         * minimum_reached/closed 시 일괄 Capture 합니다.
         */
        await groupBuyingService.updateGroupDealParticipants({
          id: participant.id,
          order_id: order.id,
          quantity: quantityToAdd,
          email: order.email ?? participant.email,
          customer_id: order.customer_id ?? participant.customer_id,
        })

        const registration =
          await billingCaptureService.storeBillingKeyForParticipant({
            participant_id: participant.id,
            billing_key: billingPayment.billingKey,
            billing_customer_key: billingPayment.customerKey,
            payment_session_id:
              billingPayment.paymentSessionId ?? billingPayment.orderId,
            payment_provider_id: billingPayment.providerId,
          })

        if (registration.should_capture) {
          dealsToCapture.add(groupDealId)
        }
      } else if (
        billingPayment?.mode === "setup_reservation" &&
        billingPayment.stripePaymentMethodId &&
        billingPayment.stripeCustomerId
      ) {
        /**
         * v2 체크아웃 + Stripe SetupIntent 예약:
         * min_participants 달성 전까지 RESERVED 상태로 유지하고
         * minimum_reached/closed 시 off-session PaymentIntent로 일괄 승인합니다.
         */
        await groupBuyingService.updateGroupDealParticipants({
          id: participant.id,
          order_id: order.id,
          quantity: quantityToAdd,
          email: order.email ?? participant.email,
          customer_id: order.customer_id ?? participant.customer_id,
        })

        const registration =
          await billingCaptureService.storeStripePaymentMethodForParticipant({
            participant_id: participant.id,
            stripe_customer_id: billingPayment.stripeCustomerId,
            stripe_payment_method_id: billingPayment.stripePaymentMethodId,
            payment_session_id:
              billingPayment.paymentSessionId ?? billingPayment.orderId,
            payment_provider_id: billingPayment.providerId,
          })

        if (registration.should_capture) {
          dealsToCapture.add(groupDealId)
        }
      } else {
        await groupBuyingService.updateGroupDealParticipants({
          id: participant.id,
          status: GroupDealParticipantStatus.CONFIRMED,
          order_id: order.id,
          quantity: quantityToAdd,
          email: order.email ?? participant.email,
          customer_id: order.customer_id ?? participant.customer_id,
        })
      }

      await groupBuyingService.recalculateDealMetrics(groupDealId)
      updatedDealIds.add(groupDealId)
    }

    for (const groupDealId of dealsToCapture) {
      await captureGroupDealPaymentsWorkflow(container).run({
        input: { group_deal_id: groupDealId },
      })
    }

    for (const groupDealId of updatedDealIds) {
      await emitGroupDealUpdated(container, groupDealId)
    }

    return new StepResponse<
      ConfirmGroupDealParticipationOutput,
      ConfirmGroupDealParticipationCompensation
    >(
      {
        updated_deals: Array.from(updatedDealIds),
        captured_deals: Array.from(dealsToCapture),
        billing_reservation:
          billingPayment?.mode === "billing_reservation" ||
          billingPayment?.mode === "setup_reservation",
      },
      compensation
    )
  },
  async (
    compensation: ConfirmGroupDealParticipationCompensation | undefined,
    { container }
  ) => {
    if (!compensation?.length) {
      return
    }

    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    for (const item of compensation) {
      const participant =
        await groupBuyingService.retrieveGroupDealParticipant(
          item.participant_id
        )

      await groupBuyingService.updateGroupDealParticipants({
        id: item.participant_id,
        status: item.previous_status,
        quantity: item.previous_quantity,
        order_id: item.previous_order_id,
        billing_customer_key: item.previous_billing_customer_key,
        payment_session_id: item.previous_payment_session_id,
        ...(item.had_billing_key
          ? {}
          : {
              billing_key_encrypted: null,
              reserved_at: null,
            }),
      })

      await groupBuyingService.recalculateDealMetrics(participant.group_deal_id)
    }
  }
)

export const confirmGroupDealParticipationWorkflow = createWorkflow(
  "confirm-group-deal-participation",
  (input: ConfirmGroupDealParticipationInput) => {
    const result = confirmGroupDealParticipationStep(input)

    return new WorkflowResponse(result)
  }
)

export { buildParticipantKey }

export type UpdateGroupDealStepInput = {
  id: string
  title?: string
  description?: string | null
  min_participants?: number
  target_quantity?: number
  max_quantity?: number | null
  original_price?: number
  deal_price?: number
  starts_at?: string
  ends_at?: string
  status?: GroupDealStatus
  metadata?: Record<string, unknown> | null
}

const updateGroupDealStep = createStep(
  "update-group-deal",
  async (input: UpdateGroupDealStepInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    const existing = await groupBuyingService.retrieveGroupDeal(input.id)

    assertDealUpdatable(existing)
    assertStatusTransitionAllowed(existing.status, input.status, existing)

    const nextStartsAt = input.starts_at
      ? new Date(input.starts_at)
      : existing.starts_at
    const nextEndsAt = input.ends_at
      ? new Date(input.ends_at)
      : existing.ends_at
    const nextMinParticipants =
      input.min_participants ?? existing.min_participants

    validateDealSchedule({
      starts_at: nextStartsAt,
      ends_at: nextEndsAt,
      min_participants: nextMinParticipants,
      current_participants: existing.current_participants,
    })

    const previous = { ...existing }

    const updated = await groupBuyingService.updateGroupDeals({
      id: input.id,
      ...(input.title != null ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.min_participants != null
        ? { min_participants: input.min_participants }
        : {}),
      ...(input.target_quantity != null
        ? { target_quantity: input.target_quantity }
        : {}),
      ...(input.max_quantity !== undefined
        ? { max_quantity: input.max_quantity }
        : {}),
      ...(input.original_price != null
        ? { original_price: input.original_price }
        : {}),
      ...(input.deal_price != null ? { deal_price: input.deal_price } : {}),
      ...(input.starts_at != null ? { starts_at: nextStartsAt } : {}),
      ...(input.ends_at != null ? { ends_at: nextEndsAt } : {}),
      ...(input.status != null ? { status: input.status } : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    })

    if (
      input.min_participants != null ||
      input.max_quantity !== undefined ||
      input.target_quantity != null
    ) {
      await groupBuyingService.recalculateDealMetrics(input.id)
    }

    const refreshed = await groupBuyingService.retrieveGroupDeal(input.id)

    return new StepResponse(refreshed, {
      id: input.id,
      previous,
    })
  },
  async (
    compensation:
      | {
          id: string
          previous: Awaited<
            ReturnType<GroupBuyingModuleService["retrieveGroupDeal"]>
          >
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
      id: compensation.id,
      title: compensation.previous.title,
      description: compensation.previous.description,
      min_participants: compensation.previous.min_participants,
      target_quantity: compensation.previous.target_quantity,
      max_quantity: compensation.previous.max_quantity,
      original_price: compensation.previous.original_price,
      deal_price: compensation.previous.deal_price,
      starts_at: compensation.previous.starts_at,
      ends_at: compensation.previous.ends_at,
      status: compensation.previous.status,
      metadata: compensation.previous.metadata,
      current_participants: compensation.previous.current_participants,
      current_quantity: compensation.previous.current_quantity,
    })
  }
)

export const updateGroupDealWorkflow = createWorkflow(
  "update-group-deal",
  (input: UpdateGroupDealStepInput) => {
    const groupDeal = updateGroupDealStep(input)

    return new WorkflowResponse(groupDeal)
  }
)

export type CancelGroupDealInput = {
  id: string
  reason?: string | null
}

export const cancelGroupDealWorkflow = createWorkflow(
  "cancel-group-deal",
  (input: CancelGroupDealInput) => {
    const groupDeal = refundGroupDealEscrowWorkflow.runAsStep({
      input: {
        group_deal_id: input.id,
        final_status: GroupDealStatus.CANCELLED,
        reason: input.reason,
      },
    })

    return new WorkflowResponse(groupDeal)
  }
)

export type DeleteGroupDealInput = {
  id: string
}

const deleteGroupDealStep = createStep(
  "delete-group-deal",
  async (input: DeleteGroupDealInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    const existing = await groupBuyingService.retrieveGroupDeal(input.id)

    assertDealDeletable(existing)

    await groupBuyingService.deleteGroupDeals(input.id)

    return new StepResponse({ id: input.id, deleted: true }, existing)
  }
)

export const deleteGroupDealWorkflow = createWorkflow(
  "delete-group-deal",
  (input: DeleteGroupDealInput) => {
    const result = deleteGroupDealStep(input)

    return new WorkflowResponse(result)
  }
)
