import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  deleteGroupDealWorkflow,
  updateGroupDealWorkflow,
} from "../../../../workflows/group-deals"
import { queryGroupDeal } from "../../../../utils/query-group-deals"
import {
  PostAdminUpdateGroupDeal,
  PostAdminUpdateGroupDealType,
} from "../validators"

const updateGroupDeal = async (
  req: AuthenticatedMedusaRequest<PostAdminUpdateGroupDealType>,
  res: MedusaResponse
) => {
  const body = PostAdminUpdateGroupDeal.parse(req.body)

  const { result } = await updateGroupDealWorkflow(req.scope).run({
    input: {
      id: req.params.id,
      ...body,
    },
  })

  const groupDeal = await queryGroupDeal(req.scope, result.id, {
    withParticipants: true,
  })

  res.json({ group_deal: groupDeal })
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const groupDeal = await queryGroupDeal(req.scope, req.params.id, {
    withParticipants: true,
  })

  res.json({ group_deal: groupDeal })
}

export const POST = updateGroupDeal
export const PUT = updateGroupDeal
export const PATCH = updateGroupDeal

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { result } = await deleteGroupDealWorkflow(req.scope).run({
    input: {
      id: req.params.id,
    },
  })

  res.status(200).json({
    id: result.id,
    object: "group_deal",
    deleted: true,
  })
}
