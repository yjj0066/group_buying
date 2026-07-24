import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { GROUP_BUYING_MODULE } from "../../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../../modules/group-buying/service"
import { saveGroupDealCoverImage } from "../../../../../../utils/group-deal-leader-ops"
import { respondWithRouteError } from "../../../../../../utils/route-error"
import { serializeAccountGroupDeal } from "../../../../../../utils/group-deal-account"

const PostStoreMeGroupDealCoverImage = z.object({
  image_base64: z.string().min(1),
  image_filename: z.string().optional(),
})

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  try {
    const body = PostStoreMeGroupDealCoverImage.parse(req.body ?? {})
    const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
      GROUP_BUYING_MODULE
    )
    const deal = await groupBuyingService.retrieveGroupDeal(req.params.id)

    if (String(deal.leader_customer_id ?? "") !== customerId) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Only the deal leader can upload a cover image"
      )
    }

    const imageUrl = await saveGroupDealCoverImage({
      groupDealId: req.params.id,
      imageBase64: body.image_base64,
      filename: body.image_filename,
    })

    const metadata = (deal.metadata as Record<string, unknown> | null) ?? {}

    await groupBuyingService.updateGroupDeals({
      id: req.params.id,
      metadata: {
        ...metadata,
        image_url: imageUrl,
      },
    })

    const updatedDeal = await groupBuyingService.retrieveGroupDeal(req.params.id)

    res.status(200).json({
      group_deal: serializeAccountGroupDeal(
        updatedDeal as unknown as Record<string, unknown>
      ),
      image_url: imageUrl,
    })
  } catch (error) {
    respondWithRouteError(res, error, {
      logLabel: "store/me/group-deals/[id]/cover-image POST",
      fallbackMessage: "Cover image upload failed on the server",
    })
  }
}
