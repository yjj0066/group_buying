import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../modules/group-buying/service"
import {
  isStoreVisibleGroupDeal,
  serializeStoreGroupDeal,
} from "../../../../utils/group-deal-store"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  let deal

  try {
    deal = await groupBuyingService.retrieveGroupDeal(req.params.id)
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Group deal with id ${req.params.id} was not found`
    )
  }

  const dealRecord = deal as unknown as Record<string, unknown>

  if (!isStoreVisibleGroupDeal(dealRecord)) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Group deal with id ${req.params.id} was not found`
    )
  }

  const options = await groupBuyingService.listDealOptions(String(deal.id))

  res.status(200).json({
    group_deal: serializeStoreGroupDeal(
      dealRecord,
      options as unknown as Record<string, unknown>[]
    ),
  })
}
