import { MedusaService } from "@medusajs/framework/utils"
import { GroupDeal, GroupDealParticipant } from "./models"
import {
  GroupDealParticipantStatus,
  GroupDealStatus,
} from "../../types/group-buying"
import {
  assertDealJoinable,
  buildParticipantKey,
  countUniqueConfirmedParticipants,
  evaluateDealStatus,
  sumConfirmedQuantity,
} from "../../utils/group-deal-rules"

class GroupBuyingModuleService extends MedusaService({
  GroupDeal,
  GroupDealParticipant,
}) {
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
    const participants = await this.listConfirmedParticipants(groupDealId)
    const groupDeal = await this.retrieveGroupDeal(groupDealId)

    const currentParticipants = countUniqueConfirmedParticipants(participants)
    const currentQuantity = sumConfirmedQuantity(participants)
    const nextStatus = evaluateDealStatus({
      ...groupDeal,
      current_participants: currentParticipants,
      current_quantity: currentQuantity,
    })

    return this.updateGroupDeals({
      id: groupDealId,
      current_participants: currentParticipants,
      current_quantity: currentQuantity,
      status: nextStatus as GroupDealStatus,
    })
  }

  async validateJoinRequest(
    deal: Awaited<ReturnType<GroupBuyingModuleService["retrieveGroupDeal"]>>,
    quantity: number
  ) {
    assertDealJoinable(deal, quantity)
  }
}

export default GroupBuyingModuleService
