import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"

import {
  DEMO_GROUP_BUY_PRODUCT_ID,
  DEMO_GROUP_BUY_VARIANT_ID,
} from "../constants/group-buying-demo-product"

/**
 * Ensures the placeholder product used by leader/seller create flows exists.
 * Run: pnpm seed:group-buy-demo-product
 */
export default async function seedGroupBuyDemoProduct({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { id: DEMO_GROUP_BUY_PRODUCT_ID },
  })

  if (existingProducts?.length) {
    logger.info(
      `Group-buy demo product already exists (${DEMO_GROUP_BUY_PRODUCT_ID}).`
    )
    return
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfile = shippingProfiles?.[0]

  if (!shippingProfile?.id) {
    logger.error("No shipping profile found. Run the initial data seed first.")
    return
  }

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
  })
  const salesChannel = salesChannels?.[0]

  if (!salesChannel?.id) {
    logger.error("No sales channel found. Run the initial data seed first.")
    return
  }

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          id: DEMO_GROUP_BUY_PRODUCT_ID,
          title: "Group Buy Placeholder Product",
          description:
            "Placeholder catalog product for hosted group-buy deal creation.",
          handle: "group-buy-placeholder",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          options: [
            {
              title: "Type",
              values: ["Default"],
            },
          ],
          variants: [
            {
              id: DEMO_GROUP_BUY_VARIANT_ID,
              title: "Default",
              sku: "GB-PLACEHOLDER",
              options: {
                Type: "Default",
              },
              prices: [
                { amount: 10000, currency_code: "krw" },
                { amount: 10, currency_code: "eur" },
                { amount: 10, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: salesChannel.id }],
        },
      ],
    },
  })

  logger.info(`Created group-buy demo product: ${DEMO_GROUP_BUY_PRODUCT_ID}`)
}
