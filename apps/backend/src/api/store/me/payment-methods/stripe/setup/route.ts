import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { createCustomerStripeSetupIntent } from "../../../../../../services/customer-payment-methods"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
    filters: { id: customerId },
  })

  const customer = data?.[0] as { id: string; email: string } | undefined

  if (!customer?.email) {
    res.status(400).json({ message: "Customer email is required" })
    return
  }

  const session = await createCustomerStripeSetupIntent({
    customerId: String(customer.id),
    email: customer.email,
  })

  res.json(session)
}
