import GroupBuyingModuleService from "../modules/group-buying/service"
import { GroupDealStatus } from "../types/group-buying"

export type LeaderHostingStats = {
  leader_role_number: number
  is_first_time_leader: boolean
}

const EXCLUDED_STATUSES = new Set<string>([GroupDealStatus.DRAFT])

type DealRecord = Record<string, unknown>

export const resolveLeaderHostingStatsFromDeals = (
  deal: { id: string; leader_customer_id?: string | null },
  hostedDeals: DealRecord[]
): LeaderHostingStats => {
  if (!deal.leader_customer_id) {
    return {
      leader_role_number: 1,
      is_first_time_leader: true,
    }
  }

  const qualifyingDeals = hostedDeals
    .filter((item) => !EXCLUDED_STATUSES.has(String(item.status)))
    .sort(
      (a, b) =>
        new Date(String(a.created_at)).getTime() -
        new Date(String(b.created_at)).getTime()
    )

  if (!qualifyingDeals.length) {
    return {
      leader_role_number: 1,
      is_first_time_leader: true,
    }
  }

  const roleIndex = qualifyingDeals.findIndex(
    (item) => String(item.id) === String(deal.id)
  )

  const leaderRoleNumber =
    roleIndex >= 0 ? roleIndex + 1 : qualifyingDeals.length

  return {
    leader_role_number: leaderRoleNumber,
    is_first_time_leader: qualifyingDeals.length <= 1,
  }
}

export const resolveLeaderHostingStats = async (
  groupBuyingService: GroupBuyingModuleService,
  deal: { id: string; leader_customer_id?: string | null }
): Promise<LeaderHostingStats> => {
  if (!deal.leader_customer_id) {
    return resolveLeaderHostingStatsFromDeals(deal, [])
  }

  const hostedDeals = await groupBuyingService.listGroupDeals({
    leader_customer_id: deal.leader_customer_id,
  })

  return resolveLeaderHostingStatsFromDeals(
    deal,
    hostedDeals as unknown as DealRecord[]
  )
}
