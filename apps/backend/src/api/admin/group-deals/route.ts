import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { GROUP_BUYING_MODULE } from "../../../modules/group-buying"
import GroupBuyingModuleService from "../../../modules/group-buying/service"
import { queryGroupDeal, queryGroupDeals } from "../../../utils/query-group-deals"
import { createGroupDealWorkflow } from "../../../workflows/group-deals"
import {
  GroupDealDepositStatus,
  GroupDealStatus,
} from "../../../types/group-buying"
import {
  PostAdminCreateGroupDeal,
  PostAdminCreateGroupDealType,
} from "./validators"

const inferIdolGroupFromTitle = (title: string): string | undefined => {
  const firstToken = title.trim().split(/\s+/)[0]

  return firstToken || undefined
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const groupDeals = await queryGroupDeals(req.scope)

  res.json({ group_deals: groupDeals })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminCreateGroupDealType>,
  res: MedusaResponse
) => {
  const body = PostAdminCreateGroupDeal.parse(req.body)

  const { result } = await createGroupDealWorkflow(req.scope).run({
    input: body,
  })

  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )

  const status = body.status ?? GroupDealStatus.DRAFT
  const metadata = {
    ...(body.metadata ?? {}),
    admin_created: true,
    source: "admin",
  }

  if (!metadata.idol_group && body.title) {
    const inferred = inferIdolGroupFromTitle(body.title)

    if (inferred) {
      metadata.idol_group = inferred
    }
  }

  const updatePayload: Record<string, unknown> = {
    id: result.id,
    metadata,
  }

  if (status === GroupDealStatus.OPEN) {
    updatePayload.deposit_status = GroupDealDepositStatus.DEPOSITED
  }

  await groupBuyingService.updateGroupDeals(updatePayload)

  const groupDeal = await queryGroupDeal(req.scope, result.id, {
    withParticipants: true,
  })

  res.status(201).json({ group_deal: groupDeal })
}
