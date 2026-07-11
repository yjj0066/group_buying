import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { GROUP_BUYING_MODULE } from "../modules/group-buying"
import GroupBuyingModuleService from "../modules/group-buying/service"
import { GroupDealStatus } from "../types/group-buying"

export type CreateGroupDealStepInput = {
  title: string
  description?: string | null
  product_id: string
  variant_id?: string | null
  target_quantity: number
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
      target_quantity: input.target_quantity,
      original_price: input.original_price,
      deal_price: input.deal_price,
      currency_code: input.currency_code,
      starts_at: new Date(input.starts_at),
      ends_at: new Date(input.ends_at),
      metadata: input.metadata ?? null,
      current_quantity: 0,
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

export type JoinGroupDealStepInput = {
  group_deal_id: string
  email: string
  quantity: number
  customer_id?: string | null
}

export const joinGroupDealStep = createStep(
  "join-group-deal",
  async (input: JoinGroupDealStepInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    const groupDeal = await groupBuyingService.retrieveGroupDeal(
      input.group_deal_id
    )

    if (groupDeal.status !== GroupDealStatus.ACTIVE) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "This group deal is not active"
      )
    }

    const now = new Date()
    const startsAt = new Date(groupDeal.starts_at)
    const endsAt = new Date(groupDeal.ends_at)

    if (now < startsAt || now > endsAt) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "This group deal is not available at this time"
      )
    }

    const participant = await groupBuyingService.createGroupDealParticipants({
      group_deal_id: input.group_deal_id,
      email: input.email,
      quantity: input.quantity,
      customer_id: input.customer_id ?? null,
    })

    const updatedDeal = await groupBuyingService.updateGroupDeals({
      id: input.group_deal_id,
      current_quantity: groupDeal.current_quantity + input.quantity,
    })

    let finalDeal = updatedDeal

    if (updatedDeal.current_quantity >= updatedDeal.target_quantity) {
      finalDeal = await groupBuyingService.updateGroupDeals({
        id: input.group_deal_id,
        status: GroupDealStatus.SUCCESS,
      })
    }

    return new StepResponse(
      { participant, group_deal: finalDeal },
      {
        participant_id: participant.id,
        group_deal_id: input.group_deal_id,
        previous_quantity: groupDeal.current_quantity,
        previous_status: groupDeal.status,
      }
    )
  },
  async (
    compensationData:
      | {
          participant_id: string
          group_deal_id: string
          previous_quantity: number
          previous_status: GroupDealStatus
        }
      | undefined,
    { container }
  ) => {
    if (!compensationData) {
      return
    }

    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    await groupBuyingService.deleteGroupDealParticipants(
      compensationData.participant_id
    )

    await groupBuyingService.updateGroupDeals({
      id: compensationData.group_deal_id,
      current_quantity: compensationData.previous_quantity,
      status: compensationData.previous_status,
    })
  }
)

export const joinGroupDealWorkflow = createWorkflow(
  "join-group-deal",
  (input: JoinGroupDealStepInput) => {
    const result = joinGroupDealStep(input)

    return new WorkflowResponse(result)
  }
)
