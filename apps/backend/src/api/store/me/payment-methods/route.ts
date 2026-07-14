import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import {
  PostStoreMePaymentMethod,
  PostStoreMePaymentMethodType,
} from "../validators"
import {
  readSavedPaymentMethods,
  SavedPaymentMethodRecord,
} from "../../../../utils/group-deal-account"

const resolveCustomer = async (
  req: AuthenticatedMedusaRequest
): Promise<Record<string, unknown> | null> => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return null
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "metadata"],
    filters: { id: customerId },
  })

  return (data?.[0] as Record<string, unknown> | undefined) ?? null
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customer = await resolveCustomer(req)

  if (!customer) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const metadata = (customer.metadata as Record<string, unknown> | null) ?? null

  res.json({
    payment_methods: readSavedPaymentMethods(metadata),
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<PostStoreMePaymentMethodType>,
  res: MedusaResponse
) => {
  const customer = await resolveCustomer(req)

  if (!customer) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const body = PostStoreMePaymentMethod.parse(req.body)
  const customerModule = req.scope.resolve(Modules.CUSTOMER)
  const metadata = {
    ...(((customer.metadata as Record<string, unknown> | null) ?? {}) as Record<
      string,
      unknown
    >),
  }

  const existing = readSavedPaymentMethods(metadata)
  const id = `pm_${Date.now()}`

  const nextMethod: SavedPaymentMethodRecord = {
    id,
    provider: body.provider,
    label: body.label,
    is_default: body.is_default ?? existing.length === 0,
    last4: body.last4 ?? null,
    brand: body.brand ?? null,
    created_at: new Date().toISOString(),
  }

  const paymentMethods = existing
    .map((method) =>
      nextMethod.is_default ? { ...method, is_default: false } : method
    )
    .concat(nextMethod)

  await customerModule.updateCustomers(String(customer.id), {
    metadata: {
      ...metadata,
      saved_payment_methods: paymentMethods,
    },
  })

  res.status(201).json({
    payment_method: nextMethod,
  })
}
