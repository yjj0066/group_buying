import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

type ValidateGroupDealProductInput = {
  product_id: string
  variant_id?: string | null
}

export const validateGroupDealProduct = async (
  container: MedusaContainer,
  input: ValidateGroupDealProductInput
) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "status", "title", "variants.id"],
    filters: { id: input.product_id },
  })

  const product = products?.[0] as
    | {
        id: string
        status?: string
        title?: string
        variants?: { id: string }[]
      }
    | undefined

  if (!product) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id ${input.product_id} was not found`
    )
  }

  if (String(product.status ?? "") !== "published") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Only published products can be used for group deals"
    )
  }

  const variants = product.variants ?? []

  if (!variants.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Product must have at least one variant"
    )
  }

  const resolvedVariantId = input.variant_id ?? variants[0]?.id ?? null

  if (input.variant_id) {
    const variantExists = variants.some(
      (variant) => variant.id === input.variant_id
    )

    if (!variantExists) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Selected variant does not belong to the product"
      )
    }
  }

  return {
    ...product,
    resolved_variant_id: resolvedVariantId,
  }
}

export const validateGroupDealSchedule = (input: {
  starts_at: string
  ends_at: string
}) => {
  const startsAt = new Date(input.starts_at)
  const endsAt = new Date(input.ends_at)

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid start or end date"
    )
  }

  if (endsAt <= startsAt) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "End date must be after start date"
    )
  }

  if (endsAt.getTime() <= Date.now()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "End date must be in the future"
    )
  }
}
