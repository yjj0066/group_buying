import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const DEFAULT_REGION = (
  process.env.NEXT_PUBLIC_DEFAULT_REGION || "kr"
).toLowerCase()

const REGION_CACHE_TTL_MS = 3600 * 1000
const REGION_FETCH_TIMEOUT_MS =
  process.env.NODE_ENV === "development" ? 2000 : 5000

const regionMapCache = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: 0,
  usingFallback: false,
}

const createFallbackRegionMap = () => {
  const fallbackMap = new Map<string, HttpTypes.StoreRegion>()

  fallbackMap.set(DEFAULT_REGION, {
    id: "fallback-region",
    name: "Default",
    currency_code: "krw",
    countries: [
      {
        iso_2: DEFAULT_REGION,
      },
    ],
  } as HttpTypes.StoreRegion)

  return fallbackMap
}

async function fetchRegionsFromBackend(cacheId: string) {
  const controller = new AbortController()
  const timeoutId = setTimeout(
    () => controller.abort(),
    REGION_FETCH_TIMEOUT_MS
  )

  try {
    const response = await fetch(`${BACKEND_URL}/store/regions`, {
      method: "GET",
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY!,
      },
      next: {
        revalidate: 3600,
        tags: [`regions-${cacheId}`],
      },
      cache: "force-cache",
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    return (await response.json()) as {
      regions?: HttpTypes.StoreRegion[]
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function getRegionMap(cacheId: string) {
  const { regionMap, regionMapUpdated } = regionMapCache
  const cacheExpired = regionMapUpdated < Date.now() - REGION_CACHE_TTL_MS
  const shouldRefresh = !regionMap.keys().next().value || cacheExpired

  if (!BACKEND_URL) {
    regionMapCache.usingFallback = true
    return createFallbackRegionMap()
  }

  if (!shouldRefresh && !regionMapCache.usingFallback) {
    return regionMap
  }

  try {
    const json = await fetchRegionsFromBackend(cacheId)
    const { regions } = json

    if (!regions?.length) {
      regionMapCache.usingFallback = true
      return createFallbackRegionMap()
    }

    regionMapCache.regionMap = new Map<string, HttpTypes.StoreRegion>()

    regions.forEach((region: HttpTypes.StoreRegion) => {
      region.countries?.forEach((country) => {
        const isoCode = country.iso_2?.toLowerCase()

        if (isoCode) {
          regionMapCache.regionMap.set(isoCode, region)
        }
      })
    })

    regionMapCache.regionMapUpdated = Date.now()
    regionMapCache.usingFallback = false

    return regionMapCache.regionMap
  } catch (error) {
    console.error(
      "[middleware] Failed to fetch regions. Falling back to default region.",
      error
    )

    if (regionMap.keys().next().value && !regionMapCache.usingFallback) {
      return regionMap
    }

    regionMapCache.usingFallback = true
    return createFallbackRegionMap()
  }
}

async function getCountryCode(
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion>
) {
  const urlCountryCode = request.nextUrl.pathname.split("/")[1]?.toLowerCase()

  const cloudflareCountryCode = (
    request as { cf?: { country?: string } }
  ).cf?.country?.toLowerCase()

  const vercelCountryCode = request.headers
    .get("x-vercel-ip-country")
    ?.toLowerCase()

  if (urlCountryCode && regionMap.has(urlCountryCode)) {
    return urlCountryCode
  }

  if (
    urlCountryCode &&
    regionMapCache.usingFallback &&
    /^[a-z]{2}$/.test(urlCountryCode)
  ) {
    return urlCountryCode
  }

  if (cloudflareCountryCode && regionMap.has(cloudflareCountryCode)) {
    return cloudflareCountryCode
  }

  if (vercelCountryCode && regionMap.has(vercelCountryCode)) {
    return vercelCountryCode
  }

  if (regionMap.has(DEFAULT_REGION)) {
    return DEFAULT_REGION
  }

  return regionMap.keys().next().value || DEFAULT_REGION
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.includes(".")) {
    return NextResponse.next()
  }

  const cacheIdCookie = request.cookies.get("_medusa_cache_id")
  const cacheId = cacheIdCookie?.value || crypto.randomUUID()

  const regionMap = await getRegionMap(cacheId)
  const countryCode = await getCountryCode(request, regionMap)
  const country = countryCode || DEFAULT_REGION
  const firstPathSegment = request.nextUrl.pathname.split("/")[1]?.toLowerCase()
  const urlHasCountry = firstPathSegment === country.toLowerCase()

  if (urlHasCountry) {
    if (!cacheIdCookie) {
      const response = NextResponse.next()
      response.cookies.set("_medusa_cache_id", cacheId, {
        maxAge: 60 * 60 * 24,
      })
      return response
    }

    return NextResponse.next()
  }

  const redirectPath =
    request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname
  const queryString = request.nextUrl.search || ""
  const redirectUrl = `${request.nextUrl.origin}/${country}${redirectPath}${queryString}`

  return NextResponse.redirect(redirectUrl, 307)
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
