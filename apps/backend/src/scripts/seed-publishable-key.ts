import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { linkSalesChannelsToApiKeyWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Dev publishable API key for storefront (.env.local).
 * Run: pnpm seed:publishable-key
 */
export default async function seedPublishableKey({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const apiKeyModule = container.resolve(Modules.API_KEY)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)

  const existing = await apiKeyModule.listApiKeys({
    type: "publishable",
  })

  if (existing.length > 0) {
    logger.info(
      `Publishable API key already exists. Token: ${existing[0].token}`
    )
    logger.info(
      "Set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY in apps/storefront/.env.local"
    )
    return
  }

  const [salesChannel] = await salesChannelModule.listSalesChannels(
    {},
    { take: 1 }
  )

  if (!salesChannel) {
    logger.error("No sales channel found. Run pnpm seed:regions first.")
    return
  }

  const created = await apiKeyModule.createApiKeys({
    title: "Storefront Dev Key",
    type: "publishable",
    created_by: "seed",
  })

  const apiKey = Array.isArray(created) ? created[0] : created

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: apiKey.id,
      add: [salesChannel.id],
    },
  })

  logger.info(`Created publishable API key: ${apiKey.token}`)
  logger.info(
    "Add to apps/storefront/.env.local:\nNEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=" +
      apiKey.token
  )
}
