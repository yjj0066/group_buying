import type { MedusaContainer } from "@medusajs/framework/types"

import { GROUP_BUYING_MODULE } from "../modules/group-buying"
import GroupBuyingModuleService from "../modules/group-buying/service"
import { GroupDealStatus } from "../types/group-buying"
import { processOverdueParticipantsWorkflow } from "../workflows/group-deal-escrow"

const ACTIVE_STATUSES = [
  GroupDealStatus.OPEN,
  GroupDealStatus.MINIMUM_REACHED,
  GroupDealStatus.ACTIVE,
]

/**
 * Hourly maintenance: expire overdue pending participants and close past-deadline deals.
 */
export default async function groupDealMaintenanceHandler(
  container: MedusaContainer
) {
  const groupBuyingService: GroupBuyingModuleService = container.resolve(
    GROUP_BUYING_MODULE
  )

  const deals = await groupBuyingService.listGroupDeals({
    status: ACTIVE_STATUSES,
  })

  const now = new Date()

  for (const deal of deals) {
    try {
      await processOverdueParticipantsWorkflow(container).run({
        input: { group_deal_id: deal.id },
      })
    } catch {
      // Continue with other deals if one fails.
    }

    if (
      deal.ends_at &&
      new Date(deal.ends_at) <= now &&
      deal.status === GroupDealStatus.OPEN
    ) {
      await groupBuyingService.updateGroupDeals({
        id: deal.id,
        status: GroupDealStatus.CLOSED,
      })
    }
  }
}

export const config = {
  name: "group-deal-maintenance",
  schedule: process.env.GROUP_DEAL_MAINTENANCE_CRON ?? "0 * * * *",
}
