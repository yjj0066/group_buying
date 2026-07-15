import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Search index feed for the Flask AI/search engine (Hybrid API).
 * Flask crawls this endpoint to build SearchDocument rows keyed by medusa_product_id.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const limit = Math.min(
    Number(req.query.limit ?? 200),
    500
  )
  const offset = Number(req.query.offset ?? 0)

  const { data: products, metadata } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "description",
      "handle",
      "status",
      "thumbnail",
      "metadata",
      "created_at",
      "updated_at",
      "categories.id",
      "categories.name",
      "variants.id",
      "variants.sku",
      "variants.prices.amount",
      "variants.prices.currency_code",
    ],
    filters: {
      status: "published",
    },
    pagination: {
      take: limit,
      skip: offset,
    },
  })

  const serialized = (products ?? []).map((product: Record<string, unknown>) => {
    const variants = (product.variants ?? []) as Record<string, unknown>[]
    const firstVariant = variants[0]
    const prices = (firstVariant?.prices ?? []) as Record<string, unknown>[]
    const firstPrice = prices[0]
    const categories = (product.categories ?? []) as Record<string, unknown>[]

    return {
      medusa_product_id: String(product.id),
      title: String(product.title ?? ""),
      description: product.description ? String(product.description) : null,
      handle: product.handle ? String(product.handle) : null,
      thumbnail: product.thumbnail ? String(product.thumbnail) : null,
      status: String(product.status ?? "published"),
      category_names: categories.map((c) => String(c.name ?? "")),
      sku: firstVariant?.sku ? String(firstVariant.sku) : null,
      price_amount: firstPrice?.amount != null ? Number(firstPrice.amount) : null,
      currency_code: firstPrice?.currency_code
        ? String(firstPrice.currency_code)
        : null,
      idol_group: product.metadata
        ? (product.metadata as Record<string, unknown>).idol_group ?? null
        : null,
      goods_type: product.metadata
        ? (product.metadata as Record<string, unknown>).goods_type ?? null
        : null,
      metadata: product.metadata ?? null,
      updated_at: product.updated_at,
    }
  })

  res.json({
    products: serialized,
    count: metadata?.count ?? serialized.length,
    offset,
    limit,
  })
}
