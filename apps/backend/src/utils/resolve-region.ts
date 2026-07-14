import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

export async function resolveRegionIdByCountryCode(
  container: MedusaContainer,
  countryCode: string
): Promise<string> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const normalized = countryCode.trim().toLowerCase()

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "countries.iso_2"],
  })

  const matchedRegion = regions?.find((region) =>
    region.countries?.some(
      (country) => country?.iso_2?.toLowerCase() === normalized
    )
  )

  if (!matchedRegion?.id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Region not found for country code: ${countryCode}`
    )
  }

  return matchedRegion.id
}
