import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { GROUP_BUYING_MODULE } from "../../../modules/group-buying"
import GroupBuyingModuleService from "../../../modules/group-buying/service"
import {
  GroupDealDepositStatus,
  GroupDealStatus,
} from "../../../types/group-buying"
import {
  isDepositSecured,
  isStoreVisibleGroupDealStatus,
  serializeStoreGroupDeal,
} from "../../../utils/group-deal-store"

const readMetadata = (deal: Record<string, unknown>) =>
  (deal.metadata as Record<string, unknown> | null) ?? {}

const isAdminPublishedDeal = (deal: Record<string, unknown>) => {
  const metadata = readMetadata(deal)

  return metadata.admin_created === true || metadata.source === "admin"
}

const isLegacyAdminOpenDeal = (deal: Record<string, unknown>) => {
  const status = String(deal.status ?? "")
  const leaderId = deal.leader_customer_id

  return (
    isStoreVisibleGroupDealStatus(status) &&
    (leaderId == null || leaderId === "") &&
    String(deal.deposit_status ?? GroupDealDepositStatus.PENDING) !==
      GroupDealDepositStatus.REFUNDED
  )
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const navigationMode = req.query.navigation === "true"

  const deals = await groupBuyingService.listGroupDeals()

  const visibleDeals = deals.filter((deal) => {
    const status = String(deal.status)
    const depositOk =
      navigationMode ||
      isDepositSecured(deal as { deposit_status?: string | null }) ||
      isAdminPublishedDeal(deal as unknown as Record<string, unknown>) ||
      isLegacyAdminOpenDeal(deal as unknown as Record<string, unknown>)

    return isStoreVisibleGroupDealStatus(status) && depositOk
  })

  const serialized = await Promise.all(
    visibleDeals.map(async (deal) => {
      const options = await groupBuyingService.listDealOptions(String(deal.id))

      return serializeStoreGroupDeal(
        deal as unknown as Record<string, unknown>,
        options as unknown as Record<string, unknown>[]
      )
    })
  )

  res.json({
    group_deals: serialized,
  })
}
