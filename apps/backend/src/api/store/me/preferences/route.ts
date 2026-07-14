import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import {
  PutStoreMePreferences,
  PutStoreMePreferencesType,
} from "../validators"
import {
  readGroupBuyingPreferences,
  GroupBuyingPreferences,
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
    preferences: readGroupBuyingPreferences(metadata),
  })
}

export const PUT = async (
  req: AuthenticatedMedusaRequest<PutStoreMePreferencesType>,
  res: MedusaResponse
) => {
  const customer = await resolveCustomer(req)

  if (!customer) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const body = PutStoreMePreferences.parse(req.body)
  const metadata = {
    ...(((customer.metadata as Record<string, unknown> | null) ?? {}) as Record<
      string,
      unknown
    >),
  }

  const current = readGroupBuyingPreferences(metadata)
  const next: GroupBuyingPreferences = {
    favorite_idol_group:
      body.favorite_idol_group !== undefined
        ? body.favorite_idol_group
        : current.favorite_idol_group,
    favorite_member:
      body.favorite_member !== undefined
        ? body.favorite_member
        : current.favorite_member,
    notify_vacancy:
      body.notify_vacancy !== undefined
        ? body.notify_vacancy
        : current.notify_vacancy,
    notify_progress:
      body.notify_progress !== undefined
        ? body.notify_progress
        : current.notify_progress,
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)

  await customerModule.updateCustomers(String(customer.id), {
    metadata: {
      ...metadata,
      group_buying_preferences: next,
    },
  })

  res.json({
    preferences: next,
  })
}
