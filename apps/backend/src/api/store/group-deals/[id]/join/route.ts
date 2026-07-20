import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { GROUP_BUYING_MODULE } from "../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../modules/group-buying/service"
import { prepareGroupDealCheckoutWorkflow } from "../../../../../workflows/group-deals"
import { generateVirtualAccount } from "../../../../../utils/virtual-account"
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

  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )
  const participantRecord = result.participant as unknown as Record<
    string,
    unknown
  >
  const dealRecord = result.group_deal as unknown as Record<string, unknown>
  const participantId = String(participantRecord.id)
  const dealMetadata =
    (dealRecord.metadata as Record<string, unknown> | null) ?? {}
  const existingAccounts =
    (dealMetadata.participant_virtual_accounts as Record<string, unknown>) ??
    {}

  const virtualAccount = generateVirtualAccount({
    reference_id: participantId,
    amount: Number(result.first_payment_amount ?? 0),
    currency_code: String(dealRecord.currency_code ?? "krw"),
    hold_minutes: 5,
  })

  await groupBuyingService.updateGroupDeals({
    id: req.params.id,
    metadata: {
      ...dealMetadata,
      payment_model: "virtual_account",
      participant_virtual_accounts: {
        ...existingAccounts,
        [participantId]: virtualAccount,
      },
    },
  })

  const paymentDeadline = new Date(virtualAccount.expires_at)

  await groupBuyingService.updateGroupDealParticipants({
    id: participantId,
    payment_deadline: paymentDeadline,
  })

  const updatedParticipant =
    await groupBuyingService.retrieveGroupDealParticipant(participantId)
  const updatedDeal = await groupBuyingService.retrieveGroupDeal(req.params.id)

  res.status(201).json({
    cart_id: result.cart_id,
    participant: serializeStoreGroupDealParticipant(
      updatedParticipant as unknown as Record<string, unknown>,
      (updatedDeal.metadata as Record<string, unknown> | null) ?? null
    ),
    group_deal: serializeStoreGroupDeal(
      updatedDeal as unknown as Record<string, unknown>
    ),
    first_payment_amount: result.first_payment_amount,
    virtual_account: virtualAccount,
    checkout_path: `/group-buying/${req.params.id}/deposit?participant=${participantId}`,
    payment_hints: {
      payment_model: "virtual_account",
      provider_id: paymentProviderId,
      provider_kind: paymentProviderKind,
      billing_mode: "virtual_account",
      auto_billing_context: false,
    },
  })
}
