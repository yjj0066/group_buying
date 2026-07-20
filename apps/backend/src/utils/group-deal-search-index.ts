import type { LeaderTrustProfile } from "./leader-trust-profile"
import { resolveLeaderHostingStatsFromDeals } from "./group-deal-leader-stats"
import {
  resolveStoreDealTimelineStage,
  type StoreDealTimelineStage,
} from "./group-deal-store"
import {
  GroupDealOptionType,
  type GroupDealSearchIndexSnapshot,
} from "../types/group-buying"

type DealRecord = Record<string, unknown>

export type GroupDealSearchIndexLeaderContext = {
  hostedDeals?: DealRecord[]
  trustBadge?: LeaderTrustProfile["badge"] | null
}

const toNumber = (value: unknown): number => {
  const numeric = Number(value)

  return Number.isFinite(numeric) ? numeric : 0
}

const toIsoString = (value: unknown): string => {
  if (!value) {
    return new Date(0).toISOString()
  }

  return new Date(value as string | Date).toISOString()
}

const readMetadata = (deal: DealRecord): Record<string, unknown> => {
  return (deal.metadata as Record<string, unknown> | null) ?? {}
}

const resolveOptionRemaining = (option: DealRecord): number | null => {
  if (option.max_quantity == null) {
    return null
  }

  return Math.max(
    0,
    toNumber(option.max_quantity) - toNumber(option.current_quantity)
  )
}

const serializeMemberOption = (option: DealRecord) => ({
  key: String(option.option_key ?? ""),
  label: String(option.label ?? ""),
  max_quantity:
    option.max_quantity != null ? toNumber(option.max_quantity) : null,
  current_quantity: toNumber(option.current_quantity),
  remaining: resolveOptionRemaining(option),
})

export const serializeSearchIndexGroupDealSnapshot = (
  deal: DealRecord,
  options: DealRecord[] = [],
  leaderContext?: GroupDealSearchIndexLeaderContext
): GroupDealSearchIndexSnapshot => {
  const metadata = readMetadata(deal)
  const memberOptions = options
    .filter((option) => String(option.option_type ?? "") === GroupDealOptionType.MEMBER)
    .map(serializeMemberOption)

  const vacantMemberList = memberOptions
    .filter((option) => (option.remaining ?? 0) > 0)
    .map((option) => option.label || option.key)

  const leaderStats = resolveLeaderHostingStatsFromDeals(
    {
      id: String(deal.id),
      leader_customer_id:
        deal.leader_customer_id != null
          ? String(deal.leader_customer_id)
          : null,
    },
    leaderContext?.hostedDeals ?? []
  )

  const trustBadge = leaderContext?.trustBadge ?? null
  const stage = resolveStoreDealTimelineStage(deal) as StoreDealTimelineStage

  return {
    id: String(deal.id),
    title: String(deal.title ?? ""),
    product_id: String(deal.product_id ?? ""),
    status: String(deal.status ?? "draft"),
    deal_price: toNumber(deal.deal_price),
    currency_code: String(deal.currency_code ?? "krw"),
    current_participants: toNumber(deal.current_participants),
    target_quantity: toNumber(deal.target_quantity),
    ends_at: toIsoString(deal.ends_at),
    updated_at: toIsoString(deal.updated_at),
    idol_group:
      metadata.idol_group != null ? String(metadata.idol_group) : null,
    member_options: memberOptions,
    vacant_member_list: vacantMemberList,
    urgent_flag: metadata.urgent_fill === true,
    trust_badge: trustBadge,
    deposit_status: String(deal.deposit_status ?? "pending"),
    leader_summary: {
      leader_role_number: leaderStats.leader_role_number,
      is_first_time_leader: leaderStats.is_first_time_leader,
      trust_badge_label: trustBadge,
    },
    receipt_status: String(deal.purchase_receipt_status ?? "pending"),
    stage,
  }
}
