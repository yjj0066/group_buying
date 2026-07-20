import { MedusaService, MedusaError } from "@medusajs/framework/utils"
import {
  GroupDeal,
  GroupDealOption,
  GroupDealParticipant,
  GroupDealParticipantSelection,
  GroupDealWaitlistEntry,
} from "./models"
import {
  GroupDealDepositStatus,
  GroupDealJoinSelectionInput,
  GroupDealParticipantStatus,
  GroupDealReceiptStatus,
  GroupDealSecondPaymentStatus,
  GroupDealStatus,
  GroupDealWaitlistStatus,
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
  GroupDealWaitlistEntry,
}) {
  /** 입금 기한 기본값 (시간) — waitlist 매칭·참여 시 적용 */
  protected readonly defaultPaymentDeadlineHours_ = Number(
    process.env.GROUP_DEAL_PAYMENT_DEADLINE_HOURS ?? 24
  )
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
    const options = await this.listDealOptions(groupDealId, false)
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

  async resolvePaymentDeadline(from: Date = new Date()): Promise<Date> {
    return new Date(
      from.getTime() + this.defaultPaymentDeadlineHours_ * 60 * 60 * 1000
    )
  }

  async listWaitingWaitlistEntries(groupDealId: string) {
    const entries = await this.listGroupDealWaitlistEntries({
      group_deal_id: groupDealId,
      status: GroupDealWaitlistStatus.WAITING,
    })

    return entries.sort((a, b) => {
      const priorityDiff = Number(b.priority ?? 0) - Number(a.priority ?? 0)

      if (priorityDiff !== 0) {
        return priorityDiff
      }

      const positionDiff =
        Number(a.queue_position ?? 0) - Number(b.queue_position ?? 0)

      if (positionDiff !== 0) {
        return positionDiff
      }

      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    })
  }

  async enqueueWaitlistEntry(input: {
    group_deal_id: string
    email: string
    customer_id?: string | null
    quantity?: number
    selections?: GroupDealJoinSelectionInput[]
    priority?: number
    metadata?: Record<string, unknown> | null
  }) {
    const deal = await this.retrieveGroupDeal(input.group_deal_id)

    if (deal.max_quantity != null && deal.current_quantity >= deal.max_quantity) {
      const existing = await this.findWaitlistEntryByIdentity({
        group_deal_id: input.group_deal_id,
        customer_id: input.customer_id,
        email: input.email,
      })

      if (
        existing &&
        existing.status === GroupDealWaitlistStatus.WAITING
      ) {
        return existing
      }
    } else {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Waitlist is only available when the group deal is full"
      )
    }

    const waitingEntries = await this.listWaitingWaitlistEntries(
      input.group_deal_id
    )
    const nextPosition =
      waitingEntries.length > 0
        ? Math.max(...waitingEntries.map((entry) => entry.queue_position ?? 0)) +
          1
        : 0

    return this.createGroupDealWaitlistEntries({
      group_deal_id: input.group_deal_id,
      email: input.email,
      customer_id: input.customer_id ?? null,
      quantity: input.quantity ?? 1,
      queue_position: nextPosition,
      priority: input.priority ?? 0,
      status: GroupDealWaitlistStatus.WAITING,
      selections_snapshot: input.selections?.length
        ? ({ items: input.selections } as Record<string, unknown>)
        : null,
      metadata: input.metadata ?? null,
    })
  }

  async findWaitlistEntryByIdentity(input: {
    group_deal_id: string
    customer_id?: string | null
    email: string
  }) {
    const entries = await this.listGroupDealWaitlistEntries({
      group_deal_id: input.group_deal_id,
    })
    const targetKey = buildParticipantKey(input)

    return (
      entries.find((entry) => {
        const entryKey = buildParticipantKey({
          customer_id: entry.customer_id,
          email: entry.email,
        })

        return entryKey === targetKey
      }) ?? null
    )
  }

  async recordLeaderDeposit(input: {
    group_deal_id: string
    leader_customer_id: string
    deposit_amount: number
    deposit_payment_key: string
  }) {
    const deal = await this.retrieveGroupDeal(input.group_deal_id)

    if (
      deal.deposit_status === GroupDealDepositStatus.DEPOSITED &&
      deal.deposit_payment_key
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Leader deposit is already recorded for this group deal"
      )
    }

    return this.updateGroupDeals({
      id: input.group_deal_id,
      leader_customer_id: input.leader_customer_id,
      deposit_amount: input.deposit_amount,
      deposit_payment_key: input.deposit_payment_key,
      deposit_status: GroupDealDepositStatus.DEPOSITED,
      deposit_paid_at: new Date(),
    })
  }

  async markLeaderDepositRefunded(groupDealId: string) {
    const deal = await this.retrieveGroupDeal(groupDealId)

    if (deal.deposit_status !== GroupDealDepositStatus.DEPOSITED) {
      return deal
    }

    return this.updateGroupDeals({
      id: groupDealId,
      deposit_status: GroupDealDepositStatus.REFUNDED,
      deposit_payment_key: null,
    })
  }

  async cancelParticipantSlot(input: {
    participant_id: string
    reason?: string | null
  }) {
    const participant = await this.retrieveGroupDealParticipant(
      input.participant_id
    )

    if (participant.status === GroupDealParticipantStatus.CANCELLED) {
      return participant
    }

    const updated = await this.updateGroupDealParticipants({
      id: participant.id,
      status: GroupDealParticipantStatus.CANCELLED,
    })

    await this.recalculateDealMetrics(participant.group_deal_id)

    return updated
  }

  async promoteWaitlistEntryToParticipant(waitlistEntryId: string) {
    const entry = await this.retrieveGroupDealWaitlistEntry(waitlistEntryId)

    if (entry.status !== GroupDealWaitlistStatus.WAITING) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Waitlist entry ${waitlistEntryId} is not waiting`
      )
    }

    const deal = await this.retrieveGroupDeal(entry.group_deal_id)
    const paymentDeadline = await this.resolvePaymentDeadline()
    const snapshotRaw = entry.selections_snapshot as
      | GroupDealJoinSelectionInput[]
      | { items?: GroupDealJoinSelectionInput[] }
      | null
    const selections = Array.isArray(snapshotRaw)
      ? snapshotRaw
      : (snapshotRaw?.items ?? [])

    let firstPaymentAmount = Number(deal.deal_price) * entry.quantity
    let secondPaymentStatus = resolveInitialSecondPaymentStatus(deal)

    if (selections.length) {
      const options = await this.listDealOptions(entry.group_deal_id)

      assertSelectionsWithinLimits({
        deal,
        options,
        selections,
        fallbackQuantity: entry.quantity,
      })

      firstPaymentAmount = computeFirstPaymentAmount({
        deal,
        options,
        selections,
        fallbackQuantity: entry.quantity,
      })
      secondPaymentStatus = resolveInitialSecondPaymentStatus(deal)
    }

    const participant = await this.createGroupDealParticipants({
      group_deal_id: entry.group_deal_id,
      email: entry.email,
      customer_id: entry.customer_id,
      quantity: entry.quantity,
      status: GroupDealParticipantStatus.PENDING,
      first_payment_amount: firstPaymentAmount,
      second_payment_status: secondPaymentStatus,
      payment_deadline: paymentDeadline,
      waitlist_entry_id: entry.id,
      billing_customer_key: buildParticipantKey({
        customer_id: entry.customer_id,
        email: entry.email,
      }),
    })

    if (selections.length) {
      const options = await this.listDealOptions(entry.group_deal_id)
      const snapshots = buildSelectionSnapshots({
        deal,
        options,
        selections,
      })

      await this.replaceParticipantSelections(participant.id, snapshots)
    }

    await this.updateGroupDealWaitlistEntries({
      id: entry.id,
      status: GroupDealWaitlistStatus.MATCHED,
      matched_participant_id: participant.id,
      matched_at: new Date(),
      payment_deadline: paymentDeadline,
    })

    return {
      waitlist_entry: await this.retrieveGroupDealWaitlistEntry(entry.id),
      participant: await this.retrieveGroupDealParticipant(participant.id),
      payment_deadline: paymentDeadline,
    }
  }

  async matchNextWaitlistEntry(groupDealId: string) {
    const deal = await this.retrieveGroupDeal(groupDealId)

    if (
      deal.max_quantity != null &&
      deal.current_quantity >= deal.max_quantity
    ) {
      return { matched: false as const }
    }

    const [nextEntry] = await this.listWaitingWaitlistEntries(groupDealId)

    if (!nextEntry) {
      return { matched: false as const }
    }

    const promotion = await this.promoteWaitlistEntryToParticipant(nextEntry.id)

    return {
      matched: true as const,
      waitlist_entry_id: nextEntry.id,
      participant_id: promotion.participant.id,
      email: promotion.participant.email,
      payment_deadline: promotion.payment_deadline,
    }
  }

  async expireOverduePendingParticipants(groupDealId: string) {
    const now = new Date()
    const participants = await this.listGroupDealParticipants({
      group_deal_id: groupDealId,
      status: GroupDealParticipantStatus.PENDING,
    })

    const expired = participants.filter((participant) => {
      if (!participant.payment_deadline) {
        return false
      }

      return new Date(participant.payment_deadline) < now
    })

    return expired
  }

  async listActiveParticipantsForSettlement(groupDealId: string) {
    return this.listGroupDealParticipants({
      group_deal_id: groupDealId,
      status: [
        GroupDealParticipantStatus.RESERVED,
        GroupDealParticipantStatus.CONFIRMED,
      ],
    })
  }

  async allParticipantsDeliveryConfirmed(groupDealId: string): Promise<boolean> {
    const participants = await this.listConfirmedParticipants(groupDealId)

    if (!participants.length) {
      return false
    }

    return participants.every((participant) =>
      Boolean(participant.delivery_confirmed_at)
    )
  }

  async confirmVirtualAccountDeposit(input: {
    group_deal_id: string
    participant_id: string
  }) {
    const participant = await this.retrieveGroupDealParticipant(
      input.participant_id
    )

    if (String(participant.group_deal_id) !== input.group_deal_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Participant ${input.participant_id} does not belong to group deal ${input.group_deal_id}`
      )
    }

    if (participant.status === GroupDealParticipantStatus.CONFIRMED) {
      return participant
    }

    if (participant.status !== GroupDealParticipantStatus.PENDING) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Only pending participants can confirm virtual account deposits"
      )
    }

    const deal = await this.retrieveGroupDeal(input.group_deal_id)
    const metadata = (deal.metadata as Record<string, unknown> | null) ?? {}
    const virtualAccounts =
      (metadata.participant_virtual_accounts as Record<string, unknown> | null) ??
      {}

    if (!virtualAccounts[input.participant_id]) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No virtual account was issued for this participant"
      )
    }

    const updatedParticipant = await this.updateGroupDealParticipants({
      id: input.participant_id,
      status: GroupDealParticipantStatus.CONFIRMED,
      captured_at: new Date(),
      capture_payment_key: `va_stub_${input.participant_id}`,
    })

    await this.recalculateDealMetrics(input.group_deal_id)

    return updatedParticipant
  }

  async autoConfirmOverdueDeliveries(now: Date = new Date()) {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    const participants = await this.listGroupDealParticipants({
      status: GroupDealParticipantStatus.CONFIRMED,
    })
    const confirmedIds: string[] = []

    for (const participant of participants) {
      if (participant.delivery_confirmed_at || !participant.tracking_updated_at) {
        continue
      }

      const trackingAt = new Date(participant.tracking_updated_at as string | Date)

      if (now.getTime() - trackingAt.getTime() < sevenDaysMs) {
        continue
      }

      const deal = await this.retrieveGroupDeal(String(participant.group_deal_id))
      const metadata = (deal.metadata as Record<string, unknown> | null) ?? {}
      const { hasOpenParticipantDisputesForParticipant } = await import(
        "../utils/group-deal-disputes"
      )

      if (
        hasOpenParticipantDisputesForParticipant(metadata, String(participant.id))
      ) {
        continue
      }

      await this.confirmParticipantDelivery(String(participant.id))
      confirmedIds.push(String(participant.id))
    }

    return confirmedIds
  }

  async confirmParticipantDelivery(participantId: string) {
    const participant = await this.retrieveGroupDealParticipant(participantId)

    if (participant.status !== GroupDealParticipantStatus.CONFIRMED) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Only confirmed participants can confirm delivery"
      )
    }

    if (participant.delivery_confirmed_at) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Delivery is already confirmed for this participant"
      )
    }

    return this.updateGroupDealParticipants({
      id: participantId,
      delivery_confirmed_at: new Date(),
    })
  }

  async cancelAllWaitlistEntries(groupDealId: string) {
    const entries = await this.listGroupDealWaitlistEntries({
      group_deal_id: groupDealId,
      status: GroupDealWaitlistStatus.WAITING,
    })

    if (!entries.length) {
      return 0
    }

    await Promise.all(
      entries.map((entry) =>
        this.updateGroupDealWaitlistEntries({
          id: entry.id,
          status: GroupDealWaitlistStatus.CANCELLED,
        })
      )
    )

    return entries.length
  }

  async updatePurchaseReceipt(input: {
    group_deal_id: string
    receipt_url?: string | null
    status?: GroupDealReceiptStatus
  }) {
    const deal = await this.retrieveGroupDeal(input.group_deal_id)
    const nextStatus =
      input.status ??
      (input.receipt_url
        ? GroupDealReceiptStatus.UPLOADED
        : (deal.purchase_receipt_status as GroupDealReceiptStatus))

    return this.updateGroupDeals({
      id: input.group_deal_id,
      ...(input.receipt_url !== undefined
        ? { purchase_receipt_url: input.receipt_url }
        : {}),
      purchase_receipt_status: nextStatus,
      purchase_receipt_verified_at:
        nextStatus === GroupDealReceiptStatus.VERIFIED
          ? new Date()
          : nextStatus === GroupDealReceiptStatus.REJECTED
            ? null
            : deal.purchase_receipt_verified_at,
    })
  }

  async bulkUpdateParticipantTracking(input: {
    group_deal_id: string
    entries: Array<{
      participant_id: string
      tracking_number: string
      carrier?: string | null
    }>
  }) {
    const participants = await this.listGroupDealParticipants({
      group_deal_id: input.group_deal_id,
    })
    const participantIds = new Set(participants.map((item) => item.id))
    const updated: string[] = []

    for (const entry of input.entries) {
      if (!participantIds.has(entry.participant_id)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Participant ${entry.participant_id} does not belong to this group deal`
        )
      }

      await this.updateGroupDealParticipants({
        id: entry.participant_id,
        tracking_number: entry.tracking_number.trim(),
        carrier: entry.carrier?.trim() ?? null,
        tracking_updated_at: new Date(),
      })

      updated.push(entry.participant_id)
    }

    return updated
  }
}

export default GroupBuyingModuleService
