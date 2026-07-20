import { redirect } from "next/navigation"

import { getHostedGroupDeal } from "@lib/data/account-group-deals"
import { getStoreGroupDeal as fetchStoreGroupDeal } from "@lib/data/group-deals"
import { retrieveCustomer } from "@lib/data/customer"
import { mapAccountGroupDealToGroupDeal } from "@lib/util/map-account-group-deal"
import { resolveCountryCode } from "@lib/util/country-code"
import { isMockFallbackEnabled } from "@lib/util/persistence-policy"
import { gbAppRoutes } from "@lib/wireframe/routes"
import type { GroupDeal } from "types/group-deal"
import type { HttpTypes } from "@medusajs/types"

export async function getStoreGroupDeal(
  dealId: string
): Promise<GroupDeal | null> {
  return fetchStoreGroupDeal(dealId)
}

export async function getLeaderGroupDealForPage(
  dealId: string
): Promise<GroupDeal | null> {
  const customer = await retrieveCustomer()

  if (customer) {
    const accountDeal = await getHostedGroupDeal(dealId)

    if (accountDeal) {
      return mapAccountGroupDealToGroupDeal(accountDeal)
    }
  }

  if (isMockFallbackEnabled()) {
    const { resolveMockLeaderGroupDealForPage } = await import(
      "@lib/data/mock-hosted-deals"
    )
    const dynamicDeal = await resolveMockLeaderGroupDealForPage(dealId)

    if (dynamicDeal) {
      return dynamicDeal
    }

    const storeDeal = await getStoreGroupDeal(dealId)

    if (storeDeal?.metadata?.hosted) {
      return storeDeal
    }
  }

  return null
}

export async function requireCustomerForGbApp(
  countryCode: string
): Promise<HttpTypes.StoreCustomer> {
  const customer = await retrieveCustomer()

  if (!customer) {
    redirect(gbAppRoutes.login(resolveCountryCode(countryCode)))
  }

  return customer
}
