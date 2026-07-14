import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { z } from "zod"

import { buildStripeSavedPaymentMethod } from "../../../../../../services/customer-payment-methods"

const BodySchema = z.object({
  setup_intent_id: z.string().min(1),
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

  const body = BodySchema.parse(req.body)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "metadata"],
    filters: { id: customerId },
  })

  const customer = data?.[0] as Record<string, unknown> | undefined

  if (!customer) {
    res.status(404).json({ message: "Customer not found" })
    return
  }

  const metadata =
    (customer.metadata as Record<string, unknown> | null) ?? {}

  const paymentMethods = await buildStripeSavedPaymentMethod({
    setupIntentId: body.setup_intent_id,
    metadata,
  })

  const customerModule = req.scope.resolve(Modules.CUSTOMER)

  await customerModule.updateCustomers(String(customer.id), {
    metadata: {
      ...metadata,
      saved_payment_methods: paymentMethods,
    },
  })

  res.status(201).json({
    payment_method: paymentMethods[paymentMethods.length - 1],
  })
}
