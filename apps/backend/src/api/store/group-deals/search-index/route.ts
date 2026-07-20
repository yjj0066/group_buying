import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { GROUP_BUYING_MODULE } from "../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../modules/group-buying/service"
import {
  GroupDealDepositStatus,
} from "../../../../types/group-buying"
import {
  isDepositSecured,
  isStoreVisibleGroupDealStatus,
} from "../../../../utils/group-deal-store"
import { buildLeaderTrustProfile } from "../../../../utils/leader-trust-profile"
import {
  serializeSearchIndexGroupDealSnapshot,
  type GroupDealSearchIndexLeaderContext,
} from "../../../../utils/group-deal-search-index"

type DealRecord = Record<string, unknown>

const readMetadata = (deal: DealRecord) =>
  (deal.metadata as Record<string, unknown> | null) ?? {}

const isAdminPublishedDeal = (deal: DealRecord) => {
  const metadata = readMetadata(deal)

  return metadata.admin_created === true || metadata.source === "admin"
}

const isLegacyAdminOpenDeal = (deal: DealRecord) => {
  const status = String(deal.status ?? "")
  const leaderId = deal.leader_customer_id

  return (
    isStoreVisibleGroupDealStatus(status) &&
    (leaderId == null || leaderId === "") &&
    String(deal.deposit_status ?? GroupDealDepositStatus.PENDING) !==
      GroupDealDepositStatus.REFUNDED
  )
}

const isStoreListedGroupDeal = (deal: DealRecord) => {
  const status = String(deal.status ?? "")
  const depositOk =
    isDepositSecured(deal as { deposit_status?: string | null }) ||
    isAdminPublishedDeal(deal) ||
    isLegacyAdminOpenDeal(deal)

  return isStoreVisibleGroupDealStatus(status) && depositOk
}

/**
 * Search index feed for the Flask AI/search engine (Hybrid API).
 * Flask crawls this endpoint to build SearchDocument rows keyed by medusa_group_deal_id.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const limit = Math.min(Number(req.query.limit ?? 100), 500)
  const offset = Math.max(Number(req.query.offset ?? 0), 0)

  const deals = await groupBuyingService.listGroupDeals()
  const visibleDeals = deals.filter((deal) =>
    isStoreListedGroupDeal(deal as unknown as DealRecord)
  )

  const paginatedDeals = visibleDeals.slice(offset, offset + limit)
  const leaderIds = [
    ...new Set(
      paginatedDeals
        .map((deal) =>
          deal.leader_customer_id != null
            ? String(deal.leader_customer_id)
            : null
        )
        .filter((value): value is string => Boolean(value))
    ),
  ]

  const leaderContextByCustomerId = new Map<
    string,
    GroupDealSearchIndexLeaderContext
  >()

  await Promise.all(
    leaderIds.map(async (leaderCustomerId) => {
      const hostedDeals = await groupBuyingService.listGroupDeals({
        leader_customer_id: leaderCustomerId,
      })
      const hostedDealRecords = hostedDeals as unknown as DealRecord[]
      const trustProfile = buildLeaderTrustProfile(hostedDealRecords)

      leaderContextByCustomerId.set(leaderCustomerId, {
        hostedDeals: hostedDealRecords,
        trustBadge: trustProfile.badge,
      })
    })
  )

  const serialized = await Promise.all(
    paginatedDeals.map(async (deal) => {
      const options = await groupBuyingService.listDealOptions(String(deal.id))
      const leaderCustomerId =
        deal.leader_customer_id != null
          ? String(deal.leader_customer_id)
          : null
      const leaderContext = leaderCustomerId
        ? leaderContextByCustomerId.get(leaderCustomerId)
        : undefined

      return serializeSearchIndexGroupDealSnapshot(
        deal as unknown as DealRecord,
        options as unknown as DealRecord[],
        leaderContext
      )
    })
  )

  res.json({
    group_deals: serialized,
    count: visibleDeals.length,
    offset,
    limit,
  })
}
