"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheTag } from "@lib/data/cookies"
import medusaError from "@lib/util/medusa-error"
import { revalidateTag } from "next/cache"
import type {
  AccountGroupDeal,
  AccountParticipation,
  GroupBuyingPreferences,
  SavedPaymentMethod,
  SettlementRecord,
} from "types/account-group-deals"

const authedFetch = async <T>(
  path: string,
  init?: {
    method?: string
    body?: Record<string, unknown>
  }
): Promise<T> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client.fetch<T>(path, {
    method: init?.method ?? "GET",
    body: init?.body,
    headers,
  })
}

export async function listHostedGroupDeals() {
  try {
    const response = await authedFetch<{ group_deals: AccountGroupDeal[] }>(
      "/store/me/group-deals/hosted"
    )

    return response.group_deals
  } catch {
    return []
  }
}

export async function listMyParticipations() {
  try {
    const response = await authedFetch<{ participations: AccountParticipation[] }>(
      "/store/me/group-deals/participations"
    )

    return response.participations
  } catch {
    return []
  }
}

export async function listMySettlements() {
  try {
    const response = await authedFetch<{ settlements: SettlementRecord[] }>(
      "/store/me/group-deals/settlements"
    )

    return response.settlements
  } catch {
    return []
  }
}

export async function listSavedPaymentMethods() {
  try {
    const response = await authedFetch<{ payment_methods: SavedPaymentMethod[] }>(
      "/store/me/payment-methods"
    )

    return response.payment_methods
  } catch {
    return []
  }
}

export async function addSavedPaymentMethod(input: {
  provider: "stripe" | "toss"
  label: string
  last4?: string | null
  brand?: string | null
  is_default?: boolean
}) {
  const response = await authedFetch<{ payment_method: SavedPaymentMethod }>(
    "/store/me/payment-methods",
    {
      method: "POST",
      body: input,
    }
  ).catch(medusaError)

  const customerCacheTag = await getCacheTag("customers")

  if (customerCacheTag) {
    revalidateTag(customerCacheTag)
  }

  return response.payment_method
}

export async function deleteSavedPaymentMethod(id: string) {
  await authedFetch<{ id: string; deleted: boolean }>(
    `/store/me/payment-methods/${id}`,
    {
      method: "DELETE",
    }
  ).catch(medusaError)

  const customerCacheTag = await getCacheTag("customers")

  if (customerCacheTag) {
    revalidateTag(customerCacheTag)
  }
}

export async function retrieveGroupBuyingPreferences() {
  try {
    const response = await authedFetch<{ preferences: GroupBuyingPreferences }>(
      "/store/me/preferences"
    )

    return response.preferences
  } catch {
    return {
      favorite_idol_group: null,
      favorite_member: null,
      notify_vacancy: true,
      notify_progress: true,
    } satisfies GroupBuyingPreferences
  }
}

export async function updateGroupBuyingPreferences(
  input: Partial<GroupBuyingPreferences>
) {
  const response = await authedFetch<{ preferences: GroupBuyingPreferences }>(
    "/store/me/preferences",
    {
      method: "PUT",
      body: input,
    }
  ).catch(medusaError)

  const customerCacheTag = await getCacheTag("customers")

  if (customerCacheTag) {
    revalidateTag(customerCacheTag)
  }

  return response.preferences
}

export async function createStripeSetupSession() {
  return authedFetch<{
    setup_intent_id: string
    client_secret: string
    publishable_key: string
  }>("/store/me/payment-methods/stripe/setup", {
    method: "POST",
  }).catch(medusaError)
}

export async function completeStripeSetup(setupIntentId: string) {
  const response = await authedFetch<{ payment_method: SavedPaymentMethod }>(
    "/store/me/payment-methods/stripe/complete",
    {
      method: "POST",
      body: { setup_intent_id: setupIntentId },
    }
  ).catch(medusaError)

  const customerCacheTag = await getCacheTag("customers")

  if (customerCacheTag) {
    revalidateTag(customerCacheTag)
  }

  return response.payment_method
}

export async function createTossBillingSession() {
  return authedFetch<{
    customer_key: string
    client_key: string
    success_url: string
    fail_url: string
    customer_email: string
  }>("/store/me/payment-methods/toss/billing", {
    method: "POST",
  }).catch(medusaError)
}

export async function confirmParticipantDelivery(participantId: string) {
  const response = await authedFetch<{
    participation: AccountParticipation
    all_delivery_confirmed: boolean
  }>(`/store/me/group-deals/participations/${participantId}/confirm-delivery`, {
    method: "POST",
  }).catch(medusaError)

  const customerCacheTag = await getCacheTag("customers")

  if (customerCacheTag) {
    revalidateTag(customerCacheTag)
  }

  return response
}
