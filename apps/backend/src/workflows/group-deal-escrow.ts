import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../modules/group-buying"
import GroupBuyingModuleService from "../modules/group-buying/service"
import { createGroupDealBillingCaptureService } from "../services/group-deal-billing-capture"
import { createGroupDealEscrowService } from "../services/group-deal-escrow"
import {
  GroupDealDepositRefundResult,
  GroupDealEscrowReleaseResult,
  GroupDealSettlementResult,
  GroupDealStatus,
  GroupDealWaitlistMatchResult,
} from "../types/group-buying"
import { hasOpenParticipantDisputes } from "../utils/group-deal-disputes"
import { emitGroupDealUpdated } from "./group-deal-billing"

export const emitGroupDealWaitlistMatched = async (
  container: { resolve: <T>(key: string) => T },
  input: {
    group_deal_id: string
    waitlist_entry_id: string
    participant_id: string
    email: string
    payment_deadline: Date
  }
) => {
  try {
    const eventBus = container.resolve(Modules.EVENT_BUS) as {
      emit: (event: {
        name: string
        data: Record<string, unknown>
      }) => Promise<void>
    }

    await eventBus.emit({
      name: "group_deal.waitlist_matched",
      data: {
        group_deal_id: input.group_deal_id,
        waitlist_entry_id: input.waitlist_entry_id,
        participant_id: input.participant_id,
        email: input.email,
        payment_deadline: input.payment_deadline.toISOString(),
      },
    })
  } catch {
    // Event bus may be unavailable in isolated tests.
  }
}

export type VacateParticipantSlotInput = {
  participant_id: string
  reason?: string | null
  /** true면 대기자 자동 매칭 시도 */
  auto_match_waitlist?: boolean
}

const vacateParticipantSlotStep = createStep(
  "vacate-participant-slot",
  async (input: VacateParticipantSlotInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )
    const escrowService = createGroupDealEscrowService(container)

    const participant = await groupBuyingService.retrieveGroupDealParticipant(
      input.participant_id
    )
    const groupDealId = participant.group_deal_id

    const releaseResult = await escrowService.releaseParticipantEscrow(
      input.participant_id
    )

    let waitlistMatch: GroupDealWaitlistMatchResult = { matched: false }

    if (input.auto_match_waitlist !== false) {
      waitlistMatch = await groupBuyingService.matchNextWaitlistEntry(groupDealId)

      if (
        waitlistMatch.matched &&
        waitlistMatch.waitlist_entry_id &&
        waitlistMatch.participant_id &&
        waitlistMatch.email
      ) {
        await emitGroupDealWaitlistMatched(container, {
          group_deal_id: groupDealId,
          waitlist_entry_id: waitlistMatch.waitlist_entry_id,
          participant_id: waitlistMatch.participant_id,
          email: waitlistMatch.email,
          payment_deadline:
            waitlistMatch.payment_deadline ??
            (await groupBuyingService.resolvePaymentDeadline()),
        })
      }
    }

    await emitGroupDealUpdated(container, groupDealId)

    return new StepResponse({
      group_deal_id: groupDealId,
      release_result: releaseResult,
      waitlist_match: waitlistMatch,
    })
  }
)

export const vacateParticipantSlotWorkflow = createWorkflow(
  "vacate-participant-slot",
  (input: VacateParticipantSlotInput) => {
    const result = vacateParticipantSlotStep(input)

    return new WorkflowResponse(result)
  }
)

export type ProcessOverdueParticipantsInput = {
  group_deal_id: string
}

const processOverdueParticipantsStep = createStep(
  "process-overdue-participants",
  async (input: ProcessOverdueParticipantsInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    const overdue = await groupBuyingService.expireOverduePendingParticipants(
      input.group_deal_id
    )

    const results: Array<{
      participant_id: string
      waitlist_match: GroupDealWaitlistMatchResult
    }> = []

    for (const participant of overdue) {
      const { result } = await vacateParticipantSlotWorkflow(container).run({
        input: {
          participant_id: participant.id,
          reason: "payment_deadline_exceeded",
          auto_match_waitlist: true,
        },
      })

      results.push({
        participant_id: participant.id,
        waitlist_match: result.waitlist_match,
      })
    }

    return new StepResponse({
      group_deal_id: input.group_deal_id,
      processed_count: results.length,
      results,
    })
  }
)

export const processOverdueParticipantsWorkflow = createWorkflow(
  "process-overdue-participants",
  (input: ProcessOverdueParticipantsInput) => {
    const result = processOverdueParticipantsStep(input)

    return new WorkflowResponse(result)
  }
)

export type RefundGroupDealEscrowInput = {
  group_deal_id: string
  final_status: GroupDealStatus.FAILED | GroupDealStatus.CANCELLED
  reason?: string | null
}

const refundGroupDealEscrowStep = createStep(
  "refund-group-deal-escrow",
  async (input: RefundGroupDealEscrowInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )
    const escrowService = createGroupDealEscrowService(container)

    const existing = await groupBuyingService.retrieveGroupDeal(input.group_deal_id)

    if (input.final_status === GroupDealStatus.CANCELLED) {
      const { assertDealCancellable } = await import(
        "../utils/group-deal-admin-rules"
      )

      assertDealCancellable(existing)
    }

    const previousStatus = existing.status

    const escrowResults = await escrowService.releaseAllParticipantEscrows(
      input.group_deal_id
    )
    const depositRefund = await escrowService.refundLeaderDeposit(
      input.group_deal_id
    )
    const cancelledWaitlist = await groupBuyingService.cancelAllWaitlistEntries(
      input.group_deal_id
    )

    const updated = await groupBuyingService.updateGroupDeals({
      id: input.group_deal_id,
      status: input.final_status,
      metadata: {
        ...(existing.metadata ?? {}),
        escrow_refunded_at: new Date().toISOString(),
        escrow_refund_reason: input.reason ?? null,
        waitlist_cancelled_count: cancelledWaitlist,
      },
    })

    await emitGroupDealUpdated(container, input.group_deal_id)

    return new StepResponse(
      {
        group_deal: updated,
        escrow_results: escrowResults,
        deposit_refund: depositRefund,
      },
      {
        group_deal_id: input.group_deal_id,
        previous_status: previousStatus,
        previous_metadata: existing.metadata,
      }
    )
  },
  async (
    compensation:
      | {
          group_deal_id: string
          previous_status: GroupDealStatus | string
          previous_metadata: Record<string, unknown> | null
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
      metadata: compensation.previous_metadata,
    })
  }
)

export const refundGroupDealEscrowWorkflow = createWorkflow(
  "refund-group-deal-escrow",
  (input: RefundGroupDealEscrowInput) => {
    const result = refundGroupDealEscrowStep(input)

    return new WorkflowResponse(result)
  }
)

export const failGroupDealWithRefundWorkflow = createWorkflow(
  "fail-group-deal-with-refund",
  (input: { group_deal_id: string; reason?: string | null }) => {
    const result = refundGroupDealEscrowStep({
      group_deal_id: input.group_deal_id,
      final_status: GroupDealStatus.FAILED,
      reason: input.reason,
    })

    return new WorkflowResponse(result)
  }
)

export type SettleGroupDealInput = {
  group_deal_id: string
}

const settleGroupDealStep = createStep(
  "settle-group-deal",
  async (input: SettleGroupDealInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )
    const billingCaptureService = createGroupDealBillingCaptureService(container)
    const escrowService = createGroupDealEscrowService(container)

    const deal = await groupBuyingService.retrieveGroupDeal(input.group_deal_id)

    if (
      deal.status !== GroupDealStatus.MINIMUM_REACHED &&
      deal.status !== GroupDealStatus.CLOSED
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Group deal ${input.group_deal_id} is not ready for settlement`
      )
    }

    const allConfirmed =
      await groupBuyingService.allParticipantsDeliveryConfirmed(
        input.group_deal_id
      )

    if (!allConfirmed) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "All confirmed participants must confirm delivery before settlement"
      )
    }

    const dealMetadata = (deal.metadata as Record<string, unknown> | null) ?? {}

    if (hasOpenParticipantDisputes(dealMetadata)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Settlement is on hold until open participant disputes are resolved"
      )
    }

    const reservedParticipants =
      await groupBuyingService.listReservedParticipants(input.group_deal_id)

    let captureResult = null

    if (reservedParticipants.length) {
      captureResult = await billingCaptureService.captureGroupDealPayments(
        input.group_deal_id
      )
    }

    const depositRefund: GroupDealDepositRefundResult =
      await escrowService.refundLeaderDeposit(input.group_deal_id)

    const updated = await groupBuyingService.updateGroupDeals({
      id: input.group_deal_id,
      status: GroupDealStatus.SETTLED,
      metadata: {
        ...(deal.metadata ?? {}),
        settled_at: new Date().toISOString(),
      },
    })

    await emitGroupDealUpdated(container, input.group_deal_id)

    const settlement: GroupDealSettlementResult = {
      group_deal_id: input.group_deal_id,
      capture_result: captureResult,
      deposit_refund: depositRefund,
      status: GroupDealStatus.SETTLED,
    }

    return new StepResponse(settlement, {
      group_deal_id: input.group_deal_id,
      previous_status: deal.status,
      previous_metadata: deal.metadata,
    })
  },
  async (
    compensation:
      | {
          group_deal_id: string
          previous_status: GroupDealStatus | string
          previous_metadata: Record<string, unknown> | null
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
      metadata: compensation.previous_metadata,
    })
  }
)

export const settleGroupDealWorkflow = createWorkflow(
  "settle-group-deal",
  (input: SettleGroupDealInput) => {
    const result = settleGroupDealStep(input)

    return new WorkflowResponse(result)
  }
)

export type RecordLeaderDepositInput = {
  group_deal_id: string
  leader_customer_id: string
  deposit_amount: number
  deposit_payment_key: string
}

const recordLeaderDepositStep = createStep(
  "record-leader-deposit",
  async (input: RecordLeaderDepositInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    const deal = await groupBuyingService.recordLeaderDeposit(input)

    await emitGroupDealUpdated(container, input.group_deal_id)

    return new StepResponse(deal)
  }
)

export const recordLeaderDepositWorkflow = createWorkflow(
  "record-leader-deposit",
  (input: RecordLeaderDepositInput) => {
    const result = recordLeaderDepositStep(input)

    return new WorkflowResponse(result)
  }
)

export type EnqueueWaitlistInput = {
  group_deal_id: string
  email: string
  customer_id?: string | null
  quantity?: number
  selections?: import("../types/group-buying").GroupDealJoinSelectionInput[]
  priority?: number
}

const enqueueWaitlistStep = createStep(
  "enqueue-waitlist",
  async (input: EnqueueWaitlistInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    const entry = await groupBuyingService.enqueueWaitlistEntry(input)

    await emitGroupDealUpdated(container, input.group_deal_id)

    return new StepResponse(entry)
  }
)

export const enqueueWaitlistWorkflow = createWorkflow(
  "enqueue-waitlist",
  (input: EnqueueWaitlistInput) => {
    const result = enqueueWaitlistStep(input)

    return new WorkflowResponse(result)
  }
)

export type ConfirmParticipantDeliveryInput = {
  participant_id: string
}

const confirmParticipantDeliveryStep = createStep(
  "confirm-participant-delivery",
  async (input: ConfirmParticipantDeliveryInput, { container }) => {
    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    const participant = await groupBuyingService.confirmParticipantDelivery(
      input.participant_id
    )

    const allConfirmed =
      await groupBuyingService.allParticipantsDeliveryConfirmed(
        participant.group_deal_id
      )

    let settlement: GroupDealSettlementResult | null = null

    if (allConfirmed) {
      const deal = await groupBuyingService.retrieveGroupDeal(
        participant.group_deal_id
      )

      if (
        deal.status === GroupDealStatus.MINIMUM_REACHED ||
        deal.status === GroupDealStatus.CLOSED
      ) {
        const { result } = await settleGroupDealWorkflow(container).run({
          input: { group_deal_id: participant.group_deal_id },
        })

        settlement = result
      }
    }

    await emitGroupDealUpdated(container, participant.group_deal_id)

    return new StepResponse({
      participant,
      all_delivery_confirmed: allConfirmed,
      settlement,
    })
  }
)

export const confirmParticipantDeliveryWorkflow = createWorkflow(
  "confirm-participant-delivery",
  (input: ConfirmParticipantDeliveryInput) => {
    const result = confirmParticipantDeliveryStep(input)

    return new WorkflowResponse(result)
  }
)
