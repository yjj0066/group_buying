import { HttpTypes } from "@medusajs/types"

export type GroupDealOrderContext = {
  group_deal_id?: string
  participant_id?: string
  medusa_product_id?: string
  payment_method?: string
}

export const extractGroupDealContextFromOrder = (
  order: HttpTypes.StoreOrder
): GroupDealOrderContext | null => {
  const orderMetadata = (order.metadata ?? {}) as Record<string, unknown>

  let groupDealId =
    typeof orderMetadata.group_deal_id === "string"
      ? orderMetadata.group_deal_id
      : undefined
  let participantId =
    typeof orderMetadata.participant_id === "string"
      ? orderMetadata.participant_id
      : undefined
  let productId: string | undefined

  for (const item of order.items ?? []) {
    const itemMetadata = (item.metadata ?? {}) as Record<string, unknown>

    if (!groupDealId && typeof itemMetadata.group_deal_id === "string") {
      groupDealId = itemMetadata.group_deal_id
    }

    if (!participantId && typeof itemMetadata.participant_id === "string") {
      participantId = itemMetadata.participant_id
    }

    if (itemMetadata.is_group_deal === true) {
      productId = item.product_id ?? item.product?.id ?? productId
    }
  }

  if (
    orderMetadata.group_deal_billing_reservation === true ||
    groupDealId ||
    participantId
  ) {
    return {
      group_deal_id: groupDealId,
      participant_id: participantId,
      medusa_product_id: productId,
      payment_method: "billing_reservation",
    }
  }

  return null
}

export const isGroupDealOrder = (order: HttpTypes.StoreOrder): boolean => {
  return extractGroupDealContextFromOrder(order) != null
}
