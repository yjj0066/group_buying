import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../modules/group-buying/service"
import {
  isStoreVisibleGroupDealStatus,
  serializeStoreGroupDeal,
} from "../../../../utils/group-deal-store"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const id = req.params.id

  let deal

  try {
    deal = await groupBuyingService.retrieveGroupDeal(id)
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Group deal with id ${id} was not found`
    )
  }

  if (!isStoreVisibleGroupDealStatus(String(deal.status))) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Group deal with id ${id} was not found`
    )
  }

  const options = await groupBuyingService.listDealOptions(id)

  res.json({
    group_deal: serializeStoreGroupDeal(
      deal as unknown as Record<string, unknown>,
      options as unknown as Record<string, unknown>[]
    ),
  })
}
