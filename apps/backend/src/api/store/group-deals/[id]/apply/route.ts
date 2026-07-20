import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../../modules/group-buying/service"
import { prepareGroupDealCheckoutWorkflow } from "../../../../../workflows/group-deals"
import { generateVirtualAccount } from "../../../../../utils/virtual-account"
import {
  serializeStoreGroupDealParticipant,
} from "../../../../../utils/group-deal-store"
import {
  PostStoreApplyGroupDeal,
  PostStoreApplyGroupDealType,
} from "../../validators"

const resolveRegionId = async (
  countryCode: string,
  container: AuthenticatedMedusaRequest["scope"]
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

const resolveCustomerEmail = async (
  req: AuthenticatedMedusaRequest,
  customerId: string
): Promise<string> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [customer],
  } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
    filters: { id: customerId },
  })

  const email = String(customer?.email ?? "").trim()

  if (!email) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Customer email is required to apply for a group deal"
    )
  }

  return email
}

export const POST = async (
  req: AuthenticatedMedusaRequest<PostStoreApplyGroupDealType>,
  res: MedusaResponse
) => {
  const body = PostStoreApplyGroupDeal.parse(req.body)
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const quantity = body.quantity ?? 1
  const email = await resolveCustomerEmail(req, customerId)
  const regionId = await resolveRegionId(body.country_code, req.scope)

  const { result } = await prepareGroupDealCheckoutWorkflow(req.scope).run({
    input: {
      group_deal_id: req.params.id,
      email,
      quantity,
      selections: [{ option_id: body.option_id, quantity }],
      region_id: regionId,
      customer_id: customerId,
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
    (dealMetadata.participant_virtual_accounts as Record<string, unknown>) ?? {}
  const existingApplicationDetails =
    (dealMetadata.participant_application_details as Record<string, unknown>) ??
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
      participant_application_details: {
        ...existingApplicationDetails,
        [participantId]: {
          member_label: body.member_label,
          shipping_address: {
            recipient_name: body.recipient_name,
            phone: body.phone,
            postal_code: "",
            address_line_1: body.address,
            address_line_2: null,
            delivery_note: body.delivery_note ?? null,
          },
        },
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
  const serializedParticipant = serializeStoreGroupDealParticipant(
    updatedParticipant as unknown as Record<string, unknown>,
    (updatedDeal.metadata as Record<string, unknown> | null) ?? null
  )

  res.status(201).json({
    participation: {
      id: participantId,
      deal_id: req.params.id,
      option_id: body.option_id,
      member_label: body.member_label,
      status: "pending_deposit",
      virtual_account: virtualAccount,
      participant: serializedParticipant,
    },
  })
}
