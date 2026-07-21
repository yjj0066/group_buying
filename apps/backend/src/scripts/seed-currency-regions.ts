import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createTaxRegionsWorkflow,
  upsertVariantPricesWorkflow,
} from "@medusajs/medusa/core-flows"

const KRW_PER_USD = 1300

const hasCountry = (
  regions: Array<{ countries?: Array<{ iso_2?: string | null }> | null }>,
  countryCode: string
) => {
  return regions.some((region) =>
    region.countries?.some(
      (country) => country.iso_2?.toLowerCase() === countryCode
    )
  )
}

export default async function seedCurrencyRegions({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const storeModule = container.resolve(Modules.STORE)
  const regionModule = container.resolve(Modules.REGION)

  const [store] = await storeModule.listStores({}, { take: 1 })

  if (!store) {
    logger.info("No store found. Skipping currency region seed.")
    return
  }

  const existingCurrencies = new Set(
    (store.supported_currencies ?? []).map((item) =>
      item.currency_code.toLowerCase()
    )
  )

  const supportedCurrencies = [
    ...(store.supported_currencies ?? []).map((item) => ({
      currency_code: item.currency_code,
      is_default: item.is_default ?? false,
    })),
  ]

  if (!existingCurrencies.has("krw")) {
    supportedCurrencies.unshift({
      currency_code: "krw",
      is_default: supportedCurrencies.every((item) => !item.is_default),
    })
  }

  if (!existingCurrencies.has("usd")) {
    supportedCurrencies.push({
      currency_code: "usd",
      is_default: false,
    })
  }

  if (!existingCurrencies.has("eur")) {
    supportedCurrencies.push({
      currency_code: "eur",
      is_default: false,
    })
  }

  if (!supportedCurrencies.some((item) => item.is_default)) {
    supportedCurrencies[0].is_default = true
  }

  await storeModule.updateStores(store.id, {
    supported_currencies: supportedCurrencies,
  })

  const regions = await regionModule.listRegions(
    {},
    { relations: ["countries"] }
  )

  const regionsToCreate: Array<{
    name: string
    currency_code: string
    countries: string[]
    payment_providers: string[]
  }> = []

  if (!hasCountry(regions, "kr")) {
    regionsToCreate.push({
      name: "Korea",
      currency_code: "krw",
      countries: ["kr"],
      payment_providers: ["pp_toss-payments_toss-payments"],
    })
  }

  if (!hasCountry(regions, "us")) {
    regionsToCreate.push({
      name: "America",
      currency_code: "usd",
      countries: ["us"],
      payment_providers: ["pp_stripe-group-deal_stripe-group-deal"],
    })
  }

  if (regionsToCreate.length) {
    await createRegionsWorkflow(container).run({
      input: {
        regions: regionsToCreate,
      },
    })

    logger.info(
      `Created regions: ${regionsToCreate.map((item) => item.name).join(", ")}`
    )
  } else {
    logger.info("Korea and America regions already exist.")
  }

  try {
    await createTaxRegionsWorkflow(container).run({
      input: [
        { country_code: "kr", provider_id: "tp_system" },
        { country_code: "us", provider_id: "tp_system" },
      ],
    })
  } catch (error) {
    logger.info("Tax regions for kr/us already exist or could not be created.")
  }

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "product_id",
      "prices.id",
      "prices.amount",
      "prices.currency_code",
    ],
  })

  const variantPrices = (variants ?? [])
    .map((variant) => {
      const prices = ((variant as { prices?: Array<{ currency_code?: string | null; amount?: number | null }> }).prices) ?? []
      const hasKrw = prices.some(
        (price) => price.currency_code?.toLowerCase() === "krw"
      )

      if (hasKrw) {
        return null
      }

      const usdPrice = prices.find(
        (price) => price.currency_code?.toLowerCase() === "usd"
      )
      const eurPrice = prices.find(
        (price) => price.currency_code?.toLowerCase() === "eur"
      )
      const baseAmount = usdPrice?.amount ?? eurPrice?.amount

      if (!baseAmount) {
        return null
      }

      const krwAmount =
        usdPrice?.amount != null
          ? Math.round(usdPrice.amount * KRW_PER_USD)
          : Math.round((eurPrice?.amount ?? baseAmount) * 1400)

      return {
        variant_id: variant.id,
        product_id: variant.product_id,
        prices: [
          {
            amount: krwAmount,
            currency_code: "krw",
          },
        ],
      }
    })
    .filter(
      (
        item
      ): item is {
        variant_id: string
        product_id: string
        prices: Array<{ amount: number; currency_code: string }>
      } => item !== null
    )

  if (variantPrices.length) {
    await upsertVariantPricesWorkflow(container).run({
      input: {
        variantPrices,
        previousVariantIds: variantPrices.map((item) => item.variant_id),
      },
    })

    logger.info(`Added KRW prices to ${variantPrices.length} variants.`)
  } else {
    logger.info("All variants already have KRW prices.")
  }

  logger.info("Currency region seed completed.")
}
