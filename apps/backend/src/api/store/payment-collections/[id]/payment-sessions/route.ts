import { createPaymentSessionsWorkflow } from "@medusajs/medusa/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
  refetchEntity,
} from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"

import { buildGroupDealPaymentSessionContext } from "../../../../../utils/group-deal-checkout-payment"

export const POST = async (
  req: AuthenticatedMedusaRequest<
    HttpTypes.StoreInitializePaymentSession,
    HttpTypes.SelectParams
  >,
  res: MedusaResponse<HttpTypes.StorePaymentCollectionResponse>
) => {
  const collectionId = req.params.id
  const { provider_id, data } = req.body

  const groupDealContext = await buildGroupDealPaymentSessionContext(
    collectionId,
    req.scope
  )

  await createPaymentSessionsWorkflow(req.scope).run({
    input: {
      payment_collection_id: collectionId,
      provider_id: provider_id,
      customer_id: req.auth_context?.actor_id,
      data,
      context: groupDealContext,
    },
  })

  const paymentCollection = await refetchEntity({
    entity: "payment_collection",
    idOrFilter: collectionId,
    scope: req.scope,
    fields: req.queryConfig.fields,
  })

  res.status(200).json({
    payment_collection:
      paymentCollection as HttpTypes.StorePaymentCollection,
  })
}
