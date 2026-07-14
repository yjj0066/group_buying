import { MedusaService, MedusaError } from "@medusajs/framework/utils"
import {
  GroupDeal,
  GroupDealOption,
  GroupDealParticipant,
  GroupDealParticipantSelection,
} from "./models"
import {
  GroupDealJoinSelectionInput,
  GroupDealParticipantStatus,
  GroupDealSecondPaymentStatus,
  GroupDealStatus,
} from "../../types/group-buying"
import {
  assertDealJoinable,
  buildParticipantKey,
  COMMITTED_PARTICIPANT_STATUSES,
  countUniqueCommittedParticipants,
  evaluateDealStatus,
  sumCommittedQuantity,
} from "../../utils/group-deal-rules"
import {
  assertSelectionsWithinLimits,
  buildSelectionSnapshots,
  computeFirstPaymentAmount,
  resolveParticipantQuantity,
} from "../../utils/group-deal-options"
import {
  resolveInitialSecondPaymentStatus,
} from "../../utils/group-deal-payment-phases"

class GroupBuyingModuleService extends MedusaService({
  GroupDeal,
  GroupDealParticipant,
  GroupDealOption,
  GroupDealParticipantSelection,
}) {
  async listDealOptions(groupDealId: string, activeOnly = true) {
    const filters: Record<string, unknown> = {
      group_deal_id: groupDealId,
    }

    if (activeOnly) {
      filters.is_active = true
    }

    const options = await this.listGroupDealOptions(filters)

    return options.sort(
      (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
    )
  }

  async listParticipantSelections(participantId: string) {
    return this.listGroupDealParticipantSelections({
      participant_id: participantId,
    })
  }

  async replaceParticipantSelections(
    participantId: string,
    snapshots: Array<{
      option_id: string
      quantity: number
      unit_price: number
    }>
  ) {
    const existing = await this.listGroupDealParticipantSelections({
      participant_id: participantId,
    })

    if (existing.length) {
      await this.deleteGroupDealParticipantSelections(
        existing.map((item) => item.id)
      )
    }

    if (!snapshots.length) {
      return []
    }

    return this.createGroupDealParticipantSelections(
      snapshots.map((snapshot) => ({
        participant_id: participantId,
        option_id: snapshot.option_id,
        quantity: snapshot.quantity,
        unit_price: snapshot.unit_price,
      }))
    )
  }

  async validateJoinSelections(input: {
    group_deal_id: string
    quantity?: number
    selections?: GroupDealJoinSelectionInput[]
  }) {
    const deal = await this.retrieveGroupDeal(input.group_deal_id)
    const options = await this.listDealOptions(input.group_deal_id)
    const totalQuantity = resolveParticipantQuantity(input)

    assertDealJoinable(deal, totalQuantity)

    if (options.length > 0 && !input.selections?.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "This group deal requires option selections (member/version)"
      )
    }

    assertSelectionsWithinLimits({
      deal,
      options,
      selections: input.selections ?? [],
      fallbackQuantity: input.quantity ?? 1,
    })

    const firstPaymentAmount = computeFirstPaymentAmount({
      deal,
      options,
      selections: input.selections ?? [],
      fallbackQuantity: input.quantity ?? 1,
    })

    return {
      deal,
      options,
      totalQuantity,
      firstPaymentAmount,
      selectionSnapshots: input.selections?.length
        ? buildSelectionSnapshots({
            deal,
            options,
            selections: input.selections,
          })
        : [],
      secondPaymentStatus: resolveInitialSecondPaymentStatus(deal),
    }
  }

  async recalculateOptionQuantities(groupDealId: string) {
    const participants = await this.listGroupDealParticipants({
      group_deal_id: groupDealId,
    })
    const options = await this.listGroupDealOptions(groupDealId, false)
    const quantities = new Map<string, number>(
      options.map((option) => [option.id, 0])
    )

    for (const participant of participants) {
      if (
        !COMMITTED_PARTICIPANT_STATUSES.includes(
          participant.status as GroupDealParticipantStatus
        )
      ) {
        continue
      }

      const selections = await this.listParticipantSelections(participant.id)

      if (selections.length) {
        for (const selection of selections) {
          quantities.set(
            selection.option_id,
            (quantities.get(selection.option_id) ?? 0) + selection.quantity
          )
        }
      }
    }

    await Promise.all(
      options.map((option) =>
        this.updateGroupDealOptions({
          id: option.id,
          current_quantity: quantities.get(option.id) ?? 0,
        })
      )
    )
  }

  async listCommittedParticipants(groupDealId: string) {
    return this.listGroupDealParticipants({
      group_deal_id: groupDealId,
      status: [
        GroupDealParticipantStatus.RESERVED,
        GroupDealParticipantStatus.CONFIRMED,
      ],
    })
  }

  async listReservedParticipants(groupDealId: string) {
    return this.listGroupDealParticipants({
      group_deal_id: groupDealId,
      status: GroupDealParticipantStatus.RESERVED,
    })
  }

  async listConfirmedParticipants(groupDealId: string) {
    return this.listGroupDealParticipants({
      group_deal_id: groupDealId,
      status: GroupDealParticipantStatus.CONFIRMED,
    })
  }

  async findParticipantByIdentity(input: {
    group_deal_id: string
    customer_id?: string | null
    email: string
  }) {
    const participants = await this.listGroupDealParticipants({
      group_deal_id: input.group_deal_id,
    })

    const targetKey = buildParticipantKey(input)

    return (
      participants.find((participant) => {
        const participantKey = buildParticipantKey({
          customer_id: participant.customer_id,
          email: participant.email,
        })

        return participantKey === targetKey
      }) ?? null
    )
  }

  async recalculateDealMetrics(groupDealId: string) {
    const participants = await this.listCommittedParticipants(groupDealId)
    const groupDeal = await this.retrieveGroupDeal(groupDealId)

    const currentParticipants = countUniqueCommittedParticipants(participants)
    const currentQuantity = sumCommittedQuantity(participants)
    const nextStatus = evaluateDealStatus({
      ...groupDeal,
      current_participants: currentParticipants,
      current_quantity: currentQuantity,
    })

    const updatedDeal = await this.updateGroupDeals({
      id: groupDealId,
      current_participants: currentParticipants,
      current_quantity: currentQuantity,
      status: nextStatus as GroupDealStatus,
    })

    await this.recalculateOptionQuantities(groupDealId)

    return updatedDeal
  }

  async validateJoinRequest(
    deal: Awaited<ReturnType<GroupBuyingModuleService["retrieveGroupDeal"]>>,
    quantity: number
  ) {
    assertDealJoinable(deal, quantity)
  }

  async getParticipantFirstPaymentAmount(participantId: string): Promise<number> {
    const participant = await this.retrieveGroupDealParticipant(participantId)
    const deal = await this.retrieveGroupDeal(participant.group_deal_id)

    if (participant.first_payment_amount != null) {
      return Number(participant.first_payment_amount)
    }

    const selections = await this.listParticipantSelections(participantId)

    if (selections.length) {
      return selections.reduce(
        (total, selection) =>
          total + Number(selection.unit_price) * selection.quantity,
        0
      )
    }

    return Number(deal.deal_price) * participant.quantity
  }

  async markSecondPaymentReady(input: {
    group_deal_id: string
    shipping_fee_per_participant: number
  }) {
    const participants = await this.listConfirmedParticipants(input.group_deal_id)

    await Promise.all(
      participants.map((participant) =>
        this.updateGroupDealParticipants({
          id: participant.id,
          second_payment_amount: input.shipping_fee_per_participant,
          second_payment_status: GroupDealSecondPaymentStatus.READY,
        })
      )
    )

    return participants.length
  }
}

export default GroupBuyingModuleService
