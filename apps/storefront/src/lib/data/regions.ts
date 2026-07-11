"use server"

import { sdk } from "@lib/config"
import { normalizeCountryCode } from "@lib/util/country-code"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"
export const listRegions = async () => {
  const useCache = process.env.NODE_ENV === "production"
  const next = useCache ? { ...(await getCacheOptions("regions")) } : undefined

  return await sdk.client
    .fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
      method: "GET",
      ...(useCache
        ? { next, cache: "force-cache" as const }
        : { cache: "no-store" as const }),
    })
    .then(({ regions }) => regions)
    .catch(() => [] as HttpTypes.StoreRegion[])
}

export const retrieveRegion = async (id: string) => {
  const next = {
    ...(await getCacheOptions(["regions", id].join("-"))),
  }

  return await sdk.client
    .fetch<{ region: HttpTypes.StoreRegion }>(`/store/regions/${id}`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ region }) => region)
}

const regionMap = new Map<string, HttpTypes.StoreRegion>()

export const getRegion = async (countryCode?: string | null) => {
  const normalizedCode = normalizeCountryCode(countryCode)

  if (normalizedCode && regionMap.has(normalizedCode)) {
    return regionMap.get(normalizedCode) ?? null
  }

  const regions = await listRegions()

  if (!regions?.length) {
    return null
  }

  regionMap.clear()

  regions.forEach((region) => {
    region.countries?.forEach((c) => {
      const isoCode = normalizeCountryCode(c?.iso_2)
      if (isoCode) {
        regionMap.set(isoCode, region)
      }
    })
  })

  if (normalizedCode) {
    const matchedRegion = regionMap.get(normalizedCode)
    if (matchedRegion) {
      return matchedRegion
    }
  }

  const defaultRegionCode = normalizeCountryCode(
    process.env.NEXT_PUBLIC_DEFAULT_REGION
  )

  if (defaultRegionCode && regionMap.has(defaultRegionCode)) {
    return regionMap.get(defaultRegionCode) ?? null
  }

  return regions[0] ?? null
}
