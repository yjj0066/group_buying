import type { HttpTypes } from "@medusajs/types"

import type { GroupDeal } from "types/group-deal"

const DEFAULT_MIN_PARTICIPANTS = 10
const DEFAULT_TARGET_QUANTITY = 100

const resolveVariantPrice = (variant?: HttpTypes.StoreProductVariant) => {
  const calculated = variant?.calculated_price

  const dealPrice = Number(calculated?.calculated_amount ?? 0)
  const originalPrice = Number(calculated?.original_amount ?? dealPrice)

  return {
    dealPrice,
    originalPrice,
    currencyCode: String(calculated?.currency_code ?? "krw").toLowerCase(),
  }
}

export const resolveProductVariant = (
  product: HttpTypes.StoreProduct,
  variantId?: string | null
) => {
  if (variantId) {
    return product.variants?.find((variant) => variant.id === variantId)
  }

  return product.variants?.[0]
}

export const buildGroupDealFromProduct = (
  product: HttpTypes.StoreProduct,
  variantId?: string | null
): GroupDeal => {
  const variant = resolveProductVariant(product, variantId)
  const { dealPrice, originalPrice, currencyCode } = resolveVariantPrice(variant)
  const metadata = (product.metadata ?? {}) as Record<string, unknown>
  const now = new Date()
  const endsAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7)

  const minParticipants = Number(metadata.min_participants) || DEFAULT_MIN_PARTICIPANTS
  const targetQuantity =
    Number(metadata.target_quantity) || DEFAULT_TARGET_QUANTITY

  return {
    id: `product-preview-${product.id}`,
    title: product.title ?? "",
    description: product.description ?? null,
    product_id: product.id,
    variant_id: variant?.id ?? null,
    min_participants: minParticipants,
    current_participants: 0,
    target_quantity: targetQuantity,
    current_quantity: 0,
    max_quantity: targetQuantity,
    original_price: originalPrice,
    deal_price: dealPrice,
    currency_code: currencyCode,
    status: "open",
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
    metadata: {
      is_product_preview: true,
      image_url: product.thumbnail ?? product.images?.[0]?.url ?? null,
      idol_group: metadata.idol_group ?? metadata.group_name ?? null,
      goods_type: metadata.goods_type ?? null,
    },
    leader_customer_id: null,
    deposit_status: "pending",
    deposit_amount: null,
    purchase_receipt_status: "pending",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }
}

export const enrichGroupDealFromProduct = (
  deal: GroupDeal,
  product: HttpTypes.StoreProduct
): GroupDeal => {
  const variant = resolveProductVariant(product, deal.variant_id)
  const { dealPrice, originalPrice, currencyCode } = resolveVariantPrice(variant)
  const productMetadata = (product.metadata ?? {}) as Record<string, unknown>
  const dealMetadata = { ...(deal.metadata ?? {}) }

  if (!dealMetadata.image_url) {
    dealMetadata.image_url =
      product.thumbnail ?? product.images?.[0]?.url ?? null
  }

  if (!dealMetadata.idol_group && productMetadata.idol_group) {
    dealMetadata.idol_group = productMetadata.idol_group
  }

  if (!deal.description && product.description) {
    deal.description = product.description
  }

  return {
    ...deal,
    title: deal.title || product.title || "",
    original_price: deal.original_price > 0 ? deal.original_price : originalPrice,
    deal_price: deal.deal_price > 0 ? deal.deal_price : dealPrice,
    currency_code: deal.currency_code || currencyCode,
    min_participants:
      deal.min_participants > 0 ? deal.min_participants : DEFAULT_MIN_PARTICIPANTS,
    target_quantity:
      deal.target_quantity > 0 ? deal.target_quantity : DEFAULT_TARGET_QUANTITY,
    metadata: dealMetadata,
  }
}

export const resolveProductHeroImage = (
  deal: GroupDeal,
  product?: HttpTypes.StoreProduct
) => {
  if (typeof deal.metadata?.image_url === "string") {
    return deal.metadata.image_url
  }

  if (!product) {
    return null
  }

  return product.thumbnail ?? product.images?.[0]?.url ?? null
}
