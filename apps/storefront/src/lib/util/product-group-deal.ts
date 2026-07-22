import type { HttpTypes } from "@medusajs/types"

import type { GroupDeal } from "types/group-deal"

const getBackendUrl = () =>
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"

const getBackendBaseUrl = () => getBackendUrl().replace(/\/$/, "")

const isLocalhostUrl = (url: string): boolean => {
  try {
    const { hostname } = new URL(url)
    return hostname === "localhost" || hostname === "127.0.0.1"
  } catch {
    return false
  }
}

const rewriteLocalhostMediaUrl = (url: string): string => {
  if (!isLocalhostUrl(url)) {
    return url
  }

  try {
    const { pathname, search, hash } = new URL(url)
    return `${getBackendBaseUrl()}${pathname}${search}${hash}`
  } catch {
    return url
  }
}

const getObjectStorageBucketName = () =>
  process.env.NEXT_PUBLIC_S3_BUCKET?.trim() ?? ""

const normalizePublicMediaPath = (url: string): string => {
  try {
    const parsed = new URL(url)

    if (!parsed.hostname.endsWith(".r2.dev")) {
      return url
    }

    const segments = parsed.pathname.split("/").filter(Boolean)
    const bucket = getObjectStorageBucketName()

    if (
      bucket &&
      segments[0] !== bucket &&
      (segments[0] === "group-buying" || segments[0] === "static")
    ) {
      segments.unshift(bucket)
    }

    const normalized: string[] = []

    for (const segment of segments) {
      if (normalized[normalized.length - 1] === segment) {
        continue
      }

      normalized.push(segment)
    }

    parsed.pathname = `/${normalized.join("/")}`

    return parsed.toString()
  } catch {
    return url
  }
}

export const resolveMediaUrl = (
  url: string | null | undefined
): string | null => {
  if (typeof url !== "string") {
    return null
  }

  const trimmed = url.trim()

  if (!trimmed) {
    return null
  }

  let resolved: string

  if (trimmed.startsWith("//")) {
    resolved = `https:${trimmed}`
  } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    resolved = trimmed
  } else if (trimmed.startsWith("/")) {
    resolved = `${getBackendUrl().replace(/\/$/, "")}${trimmed}`
  } else {
    resolved = trimmed
  }

  return normalizePublicMediaPath(rewriteLocalhostMediaUrl(resolved))
}

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
      image_url: resolveMediaUrl(
        product.thumbnail ?? product.images?.[0]?.url ?? null
      ),
      idol_group: metadata.idol_group ?? metadata.group_name ?? null,
      goods_type: metadata.goods_type ?? null,
    },
    leader_customer_id: null,
    leader_role_number: 1,
    is_first_time_leader: true,
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

  const productImageUrl = resolveMediaUrl(
    product.thumbnail ?? product.images?.[0]?.url ?? null
  )

  dealMetadata.image_url = resolveMediaUrl(
    typeof dealMetadata.image_url === "string"
      ? dealMetadata.image_url
      : productImageUrl
  ) ?? productImageUrl

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
  const fromMetadata = resolveMediaUrl(
    typeof deal.metadata?.image_url === "string" ? deal.metadata.image_url : null
  )

  if (fromMetadata) {
    return fromMetadata
  }

  if (!product) {
    return null
  }

  return resolveMediaUrl(product.thumbnail ?? product.images?.[0]?.url ?? null)
}

export const resolveGroupDealThumbnailUrl = (deal: GroupDeal): string | null =>
  resolveMediaUrl(
    typeof deal.metadata?.image_url === "string" ? deal.metadata.image_url : null
  )

export const enrichGroupDealsWithProducts = (
  deals: GroupDeal[],
  products: HttpTypes.StoreProduct[]
): GroupDeal[] => {
  const productsById = new Map(products.map((product) => [product.id, product]))

  return deals.map((deal) => {
    if (!deal.product_id || deal.product_id.startsWith("demo-")) {
      return deal
    }

    const product = productsById.get(deal.product_id)

    if (!product) {
      return deal
    }

    return enrichGroupDealFromProduct(deal, product)
  })
}
