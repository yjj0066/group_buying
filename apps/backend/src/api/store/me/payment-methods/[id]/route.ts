import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

import { readSavedPaymentMethods } from "../../../../../utils/group-deal-account"

export const DELETE = async (
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
    fields: ["id", "metadata"],
    filters: { id: customerId },
  })

  const customer = data?.[0] as Record<string, unknown> | undefined

  if (!customer) {
    res.status(404).json({ message: "Customer not found" })
    return
  }

  const metadata = {
    ...(((customer.metadata as Record<string, unknown> | null) ?? {}) as Record<
      string,
      unknown
    >),
  }

  const existing = readSavedPaymentMethods(metadata)
  const targetId = req.params.id
  const nextMethods = existing.filter((method) => method.id !== targetId)

  if (nextMethods.length === existing.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Payment method ${targetId} was not found`
    )
  }

  if (nextMethods.length && !nextMethods.some((method) => method.is_default)) {
    nextMethods[0] = { ...nextMethods[0], is_default: true }
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)

  await customerModule.updateCustomers(String(customer.id), {
    metadata: {
      ...metadata,
      saved_payment_methods: nextMethods,
    },
  })

  res.status(200).json({
    id: targetId,
    deleted: true,
  })
}
