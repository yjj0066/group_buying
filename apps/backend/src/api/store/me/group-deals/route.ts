import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

import {
  GroupDealDepositStatus,
  GroupDealOptionType,
  GroupDealStatus,
} from "../../../../types/group-buying"
import { GROUP_BUYING_MODULE } from "../../../../modules/group-buying"
import GroupBuyingModuleService from "../../../../modules/group-buying/service"
import { saveGroupDealCoverImage } from "../../../../utils/group-deal-leader-ops"
import { calculateLeaderDepositAmount } from "../../../../utils/group-deal-leader-deposit"
import { generateLeaderDepositVirtualAccount } from "../../../../utils/virtual-account"
import { respondWithRouteError } from "../../../../utils/route-error"
import { serializeAccountGroupDeal } from "../../../../utils/group-deal-account"
import {
  validateGroupDealProduct,
  validateGroupDealSchedule,
} from "../../../../utils/validate-group-deal-product"
import { createGroupDealWorkflow } from "../../../../workflows/group-deals"
import { recordLeaderDepositWorkflow } from "../../../../workflows/group-deal-escrow"
import {
  PostStoreCreateGroupDeal,
  PostStoreCreateGroupDealType,
} from "./validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<PostStoreCreateGroupDealType>,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  try {
    const body = PostStoreCreateGroupDeal.parse(req.body)

  if (body.deal_price > body.original_price) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Deal price cannot exceed original price"
    )
  }

  if (body.min_participants > body.target_quantity) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Minimum participants cannot exceed target quantity"
    )
  }

  validateGroupDealSchedule({
    starts_at: body.starts_at,
    ends_at: body.ends_at,
  })

  const validatedProduct = await validateGroupDealProduct(req.scope, {
    product_id: body.product_id,
    variant_id: body.variant_id,
  })

  const depositAmount = calculateLeaderDepositAmount({
    deal_price: body.deal_price,
    target_quantity: body.target_quantity,
  })

  const declaredAlbumQuantity =
    body.declared_album_quantity ?? body.target_quantity

  const {
    member_seats,
    idol_group,
    goods_type,
    image_base64,
    image_filename,
    confirm_leader_deposit,
    deposit_payment_key,
    ...dealInput
  } = body

  const slugifyOptionKey = (label: string, index: number) => {
    const slug = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    return slug || `member-${index}`
  }

  const options = (member_seats ?? []).map((seat, index) => ({
    option_type: GroupDealOptionType.MEMBER,
    option_key: slugifyOptionKey(seat.label, index),
    label: seat.label,
    deal_price: seat.price,
    original_price: seat.price,
    max_quantity: seat.quantity,
    sort_order: index,
  }))

  const metadata = {
    declared_album_quantity: declaredAlbumQuantity,
    primary_seller: body.primary_seller ?? null,
    expected_ship_date: body.expected_ship_date ?? null,
    payment_model: "virtual_account",
    idol_group: idol_group ?? null,
    goods_type: goods_type ?? null,
    ...(member_seats?.length ? { member_seats } : {}),
  }

  const { result } = await createGroupDealWorkflow(req.scope).run({
    input: {
      ...dealInput,
      variant_id: validatedProduct.resolved_variant_id ?? body.variant_id,
      max_quantity: body.max_quantity ?? body.target_quantity,
      status: GroupDealStatus.OPEN,
      leader_customer_id: customerId,
      deposit_amount: depositAmount,
      deposit_status: GroupDealDepositStatus.PENDING,
      options,
      metadata,
    },
  })

  const groupBuyingService: GroupBuyingModuleService = req.scope.resolve(
    GROUP_BUYING_MODULE
  )
  const dealId = String((result as { id: string }).id)
  const leaderDepositVirtualAccount = generateLeaderDepositVirtualAccount({
    group_deal_id: dealId,
    deposit_amount: depositAmount,
    currency_code: body.currency_code,
  })

  let imageUrl: string | null = null

  if (image_base64) {
    try {
      imageUrl = await saveGroupDealCoverImage({
        groupDealId: dealId,
        imageBase64: image_base64,
        filename: image_filename,
      })
    } catch (error) {
      const isValidationError =
        error instanceof MedusaError &&
        error.type === MedusaError.Types.INVALID_DATA &&
        /document image must be|image_base64 must be/i.test(error.message)

      if (isValidationError) {
        throw error
      }

      console.error(
        "[store/me/group-deals POST] cover image upload failed; continuing without image",
        error
      )
    }
  }

  await groupBuyingService.updateGroupDeals({
    id: dealId,
    metadata: {
      ...metadata,
      leader_deposit_virtual_account: leaderDepositVirtualAccount,
      ...(imageUrl ? { image_url: imageUrl } : {}),
    },
  })

  if (confirm_leader_deposit && deposit_payment_key) {
    await recordLeaderDepositWorkflow(req.scope).run({
      input: {
        group_deal_id: dealId,
        leader_customer_id: customerId,
        deposit_amount: depositAmount,
        deposit_payment_key,
      },
    })
  }

  const updatedDeal = await groupBuyingService.retrieveGroupDeal(dealId)

  res.status(201).json({
    group_deal: serializeAccountGroupDeal(
      updatedDeal as unknown as Record<string, unknown>
    ),
    leader_deposit_virtual_account: leaderDepositVirtualAccount,
    deposit_recorded: Boolean(confirm_leader_deposit && deposit_payment_key),
  })
  } catch (error) {
    respondWithRouteError(res, error, {
      logLabel: "store/me/group-deals POST",
      fallbackMessage: "Group deal creation failed on the server",
    })
  }
}
