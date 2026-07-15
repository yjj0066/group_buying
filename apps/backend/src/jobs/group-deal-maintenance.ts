import type { MedusaContainer } from "@medusajs/framework/types"

import { GROUP_BUYING_MODULE } from "../modules/group-buying"
import GroupBuyingModuleService from "../modules/group-buying/service"
import { GroupDealStatus } from "../types/group-buying"
import { processOverdueParticipantsWorkflow } from "../workflows/group-deal-escrow"

const ACTIVE_STATUSES = [
  GroupDealStatus.OPEN,
  GroupDealStatus.MINIMUM_REACHED,
]

/**
 * Hourly maintenance: expire overdue pending participants and close past-deadline deals.
 */
export default async function groupDealMaintenanceHandler(
  container: MedusaContainer
) {
  const groupBuyingService: GroupBuyingModuleService =
    container.resolve(GROUP_BUYING_MODULE)

  const deals = await groupBuyingService.listGroupDeals({
    status: ACTIVE_STATUSES,
  })

  for (const deal of deals) {
    await processOverdueParticipantsWorkflow(container).run({
      input: { group_deal_id: String(deal.id) },
    })
  }

  const now = new Date()

  for (const deal of deals) {
    const endsAt = deal.ends_at ? new Date(deal.ends_at as string | Date) : null

    if (endsAt && endsAt <= now && deal.status === GroupDealStatus.OPEN) {
      await groupBuyingService.updateGroupDeals({
        id: String(deal.id),
        status: GroupDealStatus.CLOSED,
      })
    }
  }
}

export const config = {
  name: "group-deal-maintenance",
  schedule: "0 * * * *",
}
