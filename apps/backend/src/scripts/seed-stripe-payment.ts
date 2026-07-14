import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

import { STRIPE_GROUP_DEAL_PROVIDER_ID } from "../utils/stripe-group-deal-options"

const OVERSEAS_COUNTRY_CODES = ["us", "gb", "de", "jp", "fr", "ca", "au"]

/**
 * 해외 리전에 Stripe 공동구매 예약 결제 프로바이더를 연결합니다.
 */
export default async function seedStripePaymentProvider({
  container,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "countries.iso_2", "payment_providers.id"],
  })

  const overseasRegions = regions.filter((region) =>
    (region.countries as Array<{ iso_2?: string }> | undefined)?.some(
      (country) =>
        OVERSEAS_COUNTRY_CODES.includes(String(country.iso_2 ?? "").toLowerCase())
    )
  )

  if (!overseasRegions.length) {
    logger.info("No overseas regions found. Skipping Stripe payment provider seed.")
    return
  }

  for (const region of overseasRegions) {
    const existingProviders =
      (region.payment_providers as Array<{ id?: string }> | undefined)?.map(
        (provider) => provider.id
      ) ?? []

    const nextProviders = Array.from(
      new Set(
        [...existingProviders, STRIPE_GROUP_DEAL_PROVIDER_ID].filter(
          (providerId): providerId is string => !!providerId
        )
      )
    )

    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: {
          payment_providers: nextProviders,
        },
      },
    })

    logger.info(
      `Region ${region.name} payment providers updated: ${nextProviders.join(", ")}`
    )
  }
}
