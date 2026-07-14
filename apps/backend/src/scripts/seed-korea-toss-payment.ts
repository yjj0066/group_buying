import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

import { TOSS_PAYMENTS_PROVIDER_ID } from "../utils/toss-payments-options"

/**
 * Korea 리전에 Toss Payments 프로바이더를 연결합니다.
 * 해외 리전(Stripe 등)은 별도 시드/Admin 설정으로 관리합니다.
 */
export default async function seedKoreaTossPaymentProvider({
  container,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "countries.iso_2", "payment_providers.id"],
  })

  const koreaRegion = regions.find((region) =>
    (region.countries as Array<{ iso_2?: string }> | undefined)?.some(
      (country) => country.iso_2?.toLowerCase() === "kr"
    )
  )

  if (!koreaRegion?.id) {
    logger.info("Korea region not found. Skipping Toss payment provider seed.")
    return
  }

  const existingProviders =
    (koreaRegion.payment_providers as Array<{ id?: string }> | undefined)?.map(
      (provider) => provider.id
    ) ?? []

  const nextProviders = Array.from(
    new Set(
      [...existingProviders, TOSS_PAYMENTS_PROVIDER_ID].filter(
        (providerId): providerId is string => !!providerId
      )
    )
  )

  await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: koreaRegion.id },
      update: {
        payment_providers: nextProviders,
      },
    },
  })

  logger.info(
    `Korea region payment providers updated: ${nextProviders.join(", ")}`
  )
}
