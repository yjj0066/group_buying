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
} from "@medusajs/medusa/core-flows"
import { GROUP_BUYING_MODULE } from "../modules/group-buying"
import GroupBuyingModuleService from "../modules/group-buying/service"
import {
  GroupDealParticipantStatus,
  GroupDealStatus,
} from "../types/group-buying"
import { assertDealJoinable, buildParticipantKey } from "../utils/group-deal-rules"

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
}

export const createGroupDealStep = createStep(
  "create-group-deal",
  async (input: CreateGroupDealStepInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

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
    })

    return new StepResponse(groupDeal, groupDeal.id)
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
  quantity: number
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

    const groupDeal = await groupBuyingService.retrieveGroupDeal(
      input.group_deal_id
    )

    assertDealJoinable(groupDeal, input.quantity)

    if (!groupDeal.variant_id) {
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
        filters: { id: groupDeal.variant_id },
      },
      { throwIfKeyNotFound: true }
    )

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
        quantity: input.quantity,
        customer_id: input.customer_id ?? participant.customer_id,
        cart_id: cartId,
        status: GroupDealParticipantStatus.PENDING,
      })
    } else if (participant) {
      participant = await groupBuyingService.updateGroupDealParticipants({
        id: participant.id,
        quantity: input.quantity,
        email: input.email,
        customer_id: input.customer_id ?? participant.customer_id,
        cart_id: cartId,
        status: GroupDealParticipantStatus.PENDING,
      })
    } else {
      participant = await groupBuyingService.createGroupDealParticipants({
        group_deal_id: input.group_deal_id,
        email: input.email,
        quantity: input.quantity,
        customer_id: input.customer_id ?? null,
        cart_id: cartId,
        status: GroupDealParticipantStatus.PENDING,
      })
    }

    await addToCartWorkflow(container).run({
      input: {
        cart_id: cartId,
        items: [
          {
            variant_id: variant.id,
            quantity: input.quantity,
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

const confirmGroupDealParticipationStep = createStep(
  "confirm-group-deal-participation",
  async (input: ConfirmGroupDealParticipationInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "email",
        "customer_id",
        "items.id",
        "items.quantity",
        "items.metadata",
      ],
      filters: { id: input.order_id },
    })

    if (!order?.items?.length) {
      return new StepResponse({ updated_deals: [] as string[] })
    }

    const updatedDealIds = new Set<string>()
    const compensation: Array<{
      participant_id: string
      previous_status: GroupDealParticipantStatus
      previous_quantity: number
      previous_order_id: string | null
    }> = []

    for (const item of order.items) {
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

    return new StepResponse(
      { updated_deals: Array.from(updatedDealIds) },
      compensation
    )
  },
  async (
    compensation:
      | Array<{
          participant_id: string
          previous_status: GroupDealParticipantStatus
          previous_quantity: number
          previous_order_id: string | null
        }>
      | undefined,
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
