import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { prepareGroupDealCheckoutWorkflow } from "../../../../../workflows/group-deals"
import {
  resolveGroupDealPaymentProviderId,
  resolveGroupDealPaymentProviderKind,
} from "../../../../../utils/group-deal-payment-provider"
import {
  PostStoreJoinGroupDeal,
  PostStoreJoinGroupDealType,
} from "../../validators"
import {
  serializeStoreGroupDeal,
  serializeStoreGroupDealParticipant,
} from "../../../../../utils/group-deal-store"

const resolveRegionId = async (
  countryCode: string,
  container: MedusaRequest["scope"]
): Promise<string> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "countries.iso_2"],
  })

  const normalizedCountry = countryCode.toLowerCase()
  const region = regions.find((entry) =>
    (entry.countries as Array<{ iso_2?: string }> | undefined)?.some(
      (country) => country.iso_2?.toLowerCase() === normalizedCountry
    )
  )

  if (!region?.id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `No region found for country code: ${countryCode}`
    )
  }

  return String(region.id)
}

export const POST = async (
  req: MedusaRequest<PostStoreJoinGroupDealType>,
  res: MedusaResponse
) => {
  const body = PostStoreJoinGroupDeal.parse(req.body)

  const customerId =
    (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id ??
    null

  const regionId = await resolveRegionId(body.country_code, req.scope)
  const paymentProviderId = resolveGroupDealPaymentProviderId(body.country_code)
  const paymentProviderKind = resolveGroupDealPaymentProviderKind(body.country_code)

  const { result } = await prepareGroupDealCheckoutWorkflow(req.scope).run({
    input: {
      group_deal_id: req.params.id,
      email: body.email,
      quantity: body.quantity,
      selections: body.selections,
      region_id: regionId,
      customer_id: customerId,
      cart_id: body.cart_id,
    },
  })

  res.status(201).json({
    cart_id: result.cart_id,
    participant: serializeStoreGroupDealParticipant(
      result.participant as unknown as Record<string, unknown>
    ),
    group_deal: serializeStoreGroupDeal(
      result.group_deal as unknown as Record<string, unknown>
    ),
    first_payment_amount: result.first_payment_amount,
    checkout_path: "/checkout",
    payment_hints: {
      provider_id: paymentProviderId,
      provider_kind: paymentProviderKind,
      billing_mode: result.billing_mode,
      auto_billing_context: true,
    },
  })
}
