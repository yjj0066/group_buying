import GroupBuyingModuleService from "../modules/group-buying/service"
import {
  resolveLeaderHostingStatsFromDeals,
  type LeaderHostingStats,
} from "./group-deal-leader-stats"
import { buildLeaderTrustProfile } from "./leader-trust-profile"

type DealRecord = Record<string, unknown>

export type StoreGroupDealLeaderContext = LeaderHostingStats & {
  leader_completed_deals: number
  leader_trust_score: number
}

export const convertLeaderTrustScoreToStorefront = (
  trustScore: number
): number => Math.round((trustScore / 5) * 100)

export const resolveStoreGroupDealLeaderContext = (
  deal: { id: string; leader_customer_id?: string | null },
  hostedDeals: DealRecord[]
): StoreGroupDealLeaderContext => {
  const hostingStats = resolveLeaderHostingStatsFromDeals(deal, hostedDeals)
  const trustProfile = buildLeaderTrustProfile(hostedDeals)

  return {
    ...hostingStats,
    leader_completed_deals: trustProfile.breakdown.completed_deals,
    leader_trust_score: convertLeaderTrustScoreToStorefront(
      trustProfile.trust_score
    ),
  }
}

export const enrichStoreGroupDealWithLeaderContext = async (
  groupBuyingService: GroupBuyingModuleService,
  deal: { id: string; leader_customer_id?: string | null }
): Promise<StoreGroupDealLeaderContext> => {
  if (!deal.leader_customer_id) {
    return resolveStoreGroupDealLeaderContext(deal, [])
  }

  const hostedDeals = await groupBuyingService.listGroupDeals({
    leader_customer_id: deal.leader_customer_id,
  })

  return resolveStoreGroupDealLeaderContext(
    deal,
    hostedDeals as unknown as DealRecord[]
  )
}

export const loadHostedDealsByLeaderCustomerIds = async (
  groupBuyingService: GroupBuyingModuleService,
  leaderCustomerIds: string[]
): Promise<Map<string, DealRecord[]>> => {
  const hostedDealsByLeaderId = new Map<string, DealRecord[]>()

  await Promise.all(
    leaderCustomerIds.map(async (leaderCustomerId) => {
      const hostedDeals = await groupBuyingService.listGroupDeals({
        leader_customer_id: leaderCustomerId,
      })

      hostedDealsByLeaderId.set(
        leaderCustomerId,
        hostedDeals as unknown as DealRecord[]
      )
    })
  )

  return hostedDealsByLeaderId
}
