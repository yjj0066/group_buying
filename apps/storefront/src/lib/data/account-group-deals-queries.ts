import { sdk } from "@lib/config"
import { getAuthHeaders, removeAuthToken } from "@lib/data/cookies"
import { retrieveCustomer } from "@lib/data/customer"
import medusaError from "@lib/util/medusa-error"
import { normalizeDraftDateToIsoDateTime } from "@lib/util/normalize-draft-date-to-iso-datetime"
import {
  DEFAULT_GROUP_BUYING_PREFERENCES,
  readGroupBuyingPreferencesFromMetadata,
} from "@lib/util/group-buying-preferences"
import {
  type IdolInterest,
} from "@lib/util/idol-interests"
import { requestCustomerEmailVerification } from "@lib/data/customer"
import { FetchError } from "@medusajs/js-sdk"
import type {
  AccountGroupDeal,
  AccountParticipation,
  GroupBuyingPreferences,
  PreferredRole,
  RefundBankAccount,
  SavedPaymentMethod,
  SettlementRecord,
  ParticipationShippingAddress,
} from "types/account-group-deals"
import { getMockParticipations, confirmMockParticipationDelivery } from "@lib/data/mock-participations"
import { isMockFallbackEnabled } from "@lib/util/persistence-policy"

const assertCustomerAuth = async () => {
  const headers = await getAuthHeaders()

  if (!("authorization" in headers) || !headers.authorization) {
    throw new Error(
      "로그인이 필요합니다. 계정에 로그인한 뒤 다시 시도해 주세요."
    )
  }

  return headers
}

export const throwOnUnauthorized = async (error: unknown): Promise<never> => {
  if (error instanceof FetchError && error.status === 401) {
    await removeAuthToken()
    throw new Error("세션이 만료되었습니다. 다시 로그인한 뒤 시도해 주세요.")
  }

  medusaError(error)
}

const maskAccountNumber = (accountNumber: string): string => {
  if (accountNumber.length <= 4) {
    return accountNumber
  }

  const visibleStart = accountNumber.slice(0, 2)
  const visibleEnd = accountNumber.slice(-4)
  const maskedMiddle = "*".repeat(Math.max(0, accountNumber.length - 6))

  return `${visibleStart}${maskedMiddle}${visibleEnd}`
}

const readRefundBankAccountFromMetadata = (
  metadata: Record<string, unknown> | null | undefined
): RefundBankAccount | null => {
  const raw = metadata?.refund_bank_account

  if (!raw || typeof raw !== "object") {
    return null
  }

  const record = raw as Record<string, unknown>

  if (
    typeof record.bank_name !== "string" ||
    typeof record.bank_code !== "string" ||
    typeof record.account_number_masked !== "string" ||
    typeof record.account_holder !== "string"
  ) {
    return null
  }

  return {
    bank_name: record.bank_name,
    bank_code: record.bank_code,
    account_number:
      typeof record.account_number === "string"
        ? record.account_number
        : record.account_number_masked,
    account_number_masked: record.account_number_masked,
    account_holder: record.account_holder,
    registered_at:
      typeof record.registered_at === "string" ? record.registered_at : null,
  }
}

export const authedFetch = async <T>(
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
  let apiDeals: AccountGroupDeal[] = []

  try {
    const response = await authedFetch<{ group_deals: AccountGroupDeal[] }>(
      "/store/me/group-deals/hosted"
    )

    apiDeals = response.group_deals ?? []
  } catch {
    // fall through to mock merge in development
  }

  if (isMockFallbackEnabled()) {
    const { listMockHostedAccountDeals } = await import("@lib/data/mock-hosted-deals")
    const mockDeals = listMockHostedAccountDeals()
    const merged = [...mockDeals]

    for (const deal of apiDeals) {
      if (!merged.some((item) => item.id === deal.id)) {
        merged.push(deal)
      }
    }

    return merged
  }

  return apiDeals
}

export async function listHostedDealParticipations(dealId: string) {
  try {
    await assertCustomerAuth()

    const response = await authedFetch<{
      participations: AccountParticipation[]
    }>(`/store/me/group-deals/${dealId}/participations`)

    return response.participations ?? []
  } catch {
    return []
  }
}

export async function getHostedGroupDeal(dealId: string) {
  const deals = await listHostedGroupDeals()

  const found = deals.find((deal) => deal.id === dealId)

  if (found) {
    return found
  }

  if (isMockFallbackEnabled()) {
    const { getMockHostedAccountDeal } = await import("@lib/data/mock-hosted-deals")
    return getMockHostedAccountDeal(dealId)
  }

  return null
}

export async function getParticipationForDeal(dealId: string) {
  const participations = await listMyParticipations()

  return (
    participations.find((participation) => participation.group_deal.id === dealId) ??
    null
  )
}

export async function getParticipationById(participantId: string) {
  const participations = await listMyParticipations()

  return (
    participations.find(
      (participation) => participation.participant_id === participantId
    ) ?? null
  )
}

export type CreateHostedGroupDealInput = {
  title: string
  description?: string | null
  product_id: string
  variant_id?: string | null
  min_participants: number
  target_quantity: number
  max_quantity?: number | null
  original_price: number
  deal_price: number
  currency_code: string
  starts_at: string
  ends_at: string
  declared_album_quantity?: number
  primary_seller?: string | null
  expected_ship_date?: string | null
  member_seats?: Array<{ label: string; price: number; quantity: number }>
  idol_group?: string | null
  goods_type?: string | null
  image_base64?: string
  image_filename?: string | null
  confirm_leader_deposit?: boolean
  deposit_payment_key?: string
}

export async function uploadHostedGroupDealCoverImage(
  dealId: string,
  input: {
    image_base64: string
    image_filename?: string | null
  }
) {
  const response = await authedFetch<{
    group_deal: AccountGroupDeal
    image_url: string
  }>(`/store/me/group-deals/${dealId}/cover-image`, {
    method: "POST",
    body: {
      image_base64: input.image_base64,
      image_filename: input.image_filename ?? null,
    },
  })

  return {
    group_deal: response.group_deal,
    image_url: response.image_url,
  }
}

export async function createHostedGroupDeal(input: CreateHostedGroupDealInput) {
  const headers = await getAuthHeaders()
  const hasAuth = "authorization" in headers && headers.authorization
  const primarySeller = input.primary_seller?.trim()

  const requestBody = {
    ...input,
    starts_at:
      normalizeDraftDateToIsoDateTime(input.starts_at) ?? input.starts_at,
    ends_at:
      normalizeDraftDateToIsoDateTime(input.ends_at, { endOfDay: true }) ??
      input.ends_at,
    expected_ship_date: input.expected_ship_date
      ? normalizeDraftDateToIsoDateTime(input.expected_ship_date)
      : null,
    primary_seller: primarySeller ? primarySeller : null,
    declared_album_quantity:
      input.declared_album_quantity ?? input.target_quantity,
    ...(input.image_base64
      ? {
          image_base64: input.image_base64,
          image_filename: input.image_filename ?? null,
        }
      : {}),
  }

  if (hasAuth) {
    try {
      const response = await authedFetch<{ group_deal: AccountGroupDeal }>(
        "/store/me/group-deals",
        {
          method: "POST",
          body: requestBody,
        }
      )

      return response.group_deal
    } catch (error) {
      if (!isMockFallbackEnabled()) {
        medusaError(error)
      }

      console.warn(
        "[hosted-deals] Create API unavailable, using mock fallback.",
        error
      )
    }
  } else if (!isMockFallbackEnabled()) {
    throw new Error(
      "로그인이 필요합니다. 계정에 로그인한 뒤 다시 시도해 주세요."
    )
  }

  if (isMockFallbackEnabled()) {
    const { createMockHostedGroupDeal } = await import("@lib/data/mock-hosted-deals")
    return createMockHostedGroupDeal(input)
  }

  throw new Error(
    "로그인이 필요합니다. 계정에 로그인한 뒤 다시 시도해 주세요."
  )
}

export async function recordLeaderDeposit(
  dealId: string,
  input: {
    deposit_amount: number
    deposit_payment_key: string
  }
) {
  try {
    return await authedFetch<{
      group_deal: AccountGroupDeal
      deposit_recorded: boolean
    }>(`/store/me/group-deals/${dealId}/deposit`, {
      method: "POST",
      body: input,
    })
  } catch (error) {
    if (isMockFallbackEnabled()) {
      const { recordMockHostedLeaderDeposit } = await import(
        "@lib/data/mock-hosted-deals"
      )
      const groupDeal = recordMockHostedLeaderDeposit(dealId, input.deposit_amount)

      if (groupDeal) {
        console.warn(
          "[hosted-deals] Deposit API unavailable, using mock fallback.",
          error
        )

        return {
          group_deal: groupDeal,
          deposit_recorded: true,
        }
      }
    }

    return medusaError(error)
  }
}

export async function confirmParticipantDelivery(participantId: string) {
  try {
    return await authedFetch<{
      participation: AccountParticipation
      all_delivery_confirmed: boolean
    }>(
      `/store/me/group-deals/participations/${participantId}/confirm-delivery`,
      {
        method: "POST",
      }
    )
  } catch (error) {
    if (isMockFallbackEnabled()) {
      const mockParticipation = getMockParticipations().find(
        (participation) => participation.participant_id === participantId
      )

      if (mockParticipation) {
        console.warn(
          "[participations] Confirm delivery API unavailable, using mock fallback.",
          error
        )

        return confirmMockParticipationDelivery(participantId)
      }
    }

    return throwOnUnauthorized(error)
  }
}

export async function listMyParticipations() {
  try {
    const response = await authedFetch<{ participations: AccountParticipation[] }>(
      "/store/me/group-deals/participations"
    )

    return response.participations ?? []
  } catch {
    // fall through to mock
  }

  if (isMockFallbackEnabled()) {
    return getMockParticipations()
  }

  return []
}

export async function getMyParticipation(participantId: string) {
  const participations = await listMyParticipations()

  return (
    participations.find(
      (participation) => participation.participant_id === participantId
    ) ?? null
  )
}

export async function updateParticipationShippingAddress(
  participantId: string,
  address: ParticipationShippingAddress
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertCustomerAuth()

    await authedFetch<{ participation: AccountParticipation }>(
      `/store/me/group-deals/participations/${participantId}/shipping-address`,
      {
        method: "PUT",
        body: address as unknown as Record<string, unknown>,
      }
    )

    return { ok: true }
  } catch (error) {
    if (isMockFallbackEnabled()) {
      console.warn(
        "[participations] Shipping address API unavailable, accepting stub update.",
        error
      )

      return { ok: true }
    }

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "배송지 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    }
  }
}

export async function listMySettlements() {
  try {
    const response = await authedFetch<{ settlements: SettlementRecord[] }>(
      "/store/me/group-deals/settlements"
    )

    if (response.settlements?.length) {
      return response.settlements
    }
  } catch {
    // fall through to mock
  }

  if (isMockFallbackEnabled()) {
    const { getMockSettlements } = await import("@lib/data/mock-settlements")
    return getMockSettlements()
  }

  return []
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

  return response.payment_method
}

export async function deleteSavedPaymentMethod(id: string) {
  await authedFetch<{ id: string; deleted: boolean }>(
    `/store/me/payment-methods/${id}`,
    {
      method: "DELETE",
    }
  ).catch(medusaError)

}

export async function retrieveGroupBuyingPreferences() {
  const headers = await getAuthHeaders()

  if (headers.authorization) {
    try {
      const response = await authedFetch<{
        preferences: GroupBuyingPreferences
      }>("/store/me/preferences")

      return response.preferences
    } catch {
      // Fall back to customer metadata when the custom route is unavailable.
    }
  }

  const customer = await retrieveCustomer().catch(() => null)

  if (!customer) {
    return { ...DEFAULT_GROUP_BUYING_PREFERENCES }
  }

  return readGroupBuyingPreferencesFromMetadata(
    (customer.metadata ?? null) as Record<string, unknown> | null
  )
}

export async function updateGroupBuyingPreferences(
  input: Partial<GroupBuyingPreferences>
) {
  await assertCustomerAuth()

  const response = await authedFetch<{
    preferences: GroupBuyingPreferences
  }>("/store/me/preferences", {
    method: "PUT",
    body: input as Record<string, unknown>,
  }).catch(throwOnUnauthorized)

  return response.preferences
}

export async function saveMyProfileSettings(input: {
  nickname: string
  email?: string
  avatar_url?: string | null
  idol_interests?: IdolInterest[]
  favorite_idol_group?: string | null
  favorite_member?: string | null
}): Promise<
  | {
      ok: true
      preferences: GroupBuyingPreferences
      emailVerificationRequired?: boolean
      verificationEmail?: string
    }
  | { ok: false; error: string }
> {
  try {
    const headers = await assertCustomerAuth()
    const customer = await retrieveCustomer()

    if (!customer) {
      return {
        ok: false,
        error: "로그인이 필요합니다. 계정에 로그인한 뒤 다시 시도해 주세요.",
      }
    }

    const trimmedNickname = input.nickname.trim()

    if (!trimmedNickname) {
      return { ok: false, error: "닉네임을 입력해 주세요." }
    }

    const metadata = {
      ...(((customer.metadata as Record<string, unknown> | null) ?? {}) as Record<
        string,
        unknown
      >),
    }
    const current = readGroupBuyingPreferencesFromMetadata(metadata)
    const primaryInterest =
      input.idol_interests?.[0] ??
      (input.favorite_idol_group
        ? {
            group: input.favorite_idol_group,
            member: input.favorite_member ?? input.favorite_idol_group,
          }
        : null)
    const next: GroupBuyingPreferences = {
      ...current,
      favorite_idol_group: primaryInterest?.group ?? null,
      favorite_member: primaryInterest?.member ?? null,
    }
    const nextMetadata: Record<string, unknown> = {
      ...metadata,
      group_buying_preferences: next,
    }

    if (input.idol_interests !== undefined) {
      nextMetadata.idol_interests = input.idol_interests
    }

    if (input.avatar_url !== undefined) {
      nextMetadata.profile_avatar_url = input.avatar_url
    }

    const trimmedEmail = input.email?.trim().toLowerCase()
    const currentEmail = customer.email?.trim().toLowerCase()
    const emailChanged = Boolean(
      trimmedEmail && currentEmail && trimmedEmail !== currentEmail
    )

    if (emailChanged && trimmedEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      if (!emailPattern.test(trimmedEmail)) {
        return { ok: false, error: "올바른 이메일 주소를 입력해 주세요." }
      }

      nextMetadata.pending_email = trimmedEmail
    }

    await sdk.store.customer
      .update(
        {
          first_name: trimmedNickname,
          last_name: customer.last_name?.trim() || "-",
          ...(emailChanged && trimmedEmail ? { email: trimmedEmail } : {}),
          metadata: nextMetadata,
        },
        {},
        headers
      )
      .catch(medusaError)

    if (emailChanged && trimmedEmail) {
      const verification = await requestCustomerEmailVerification(trimmedEmail)

      if (!verification.ok) {
        return { ok: false, error: verification.error }
      }

      return {
        ok: true,
        preferences: next,
        emailVerificationRequired: true,
        verificationEmail: trimmedEmail,
      }
    }

    return { ok: true, preferences: next }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "프로필 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    }
  }
}

export async function requestCustomerWithdrawal(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const headers = await assertCustomerAuth()
    const customer = await retrieveCustomer()

    if (!customer) {
      return {
        ok: false,
        error: "로그인이 필요합니다. 계정에 로그인한 뒤 다시 시도해 주세요.",
      }
    }

    const metadata = {
      ...(((customer.metadata as Record<string, unknown> | null) ?? {}) as Record<
        string,
        unknown
      >),
    }

    await sdk.store.customer
      .update(
        {
          metadata: {
            ...metadata,
            account_withdrawal_requested: true,
            account_withdrawal_requested_at: new Date().toISOString(),
          },
        },
        {},
        headers
      )
      .catch(medusaError)

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "회원 탈퇴 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    }
  }
}

export async function getBankAccount() {
  const headers = await getAuthHeaders()

  if (headers.authorization) {
    try {
      const response = await authedFetch<{ bank_account: RefundBankAccount | null }>(
        "/store/me/bank-account"
      )

      return response.bank_account
    } catch {
      // Fall back to customer metadata when the custom route is unavailable.
    }
  }

  const customer = await retrieveCustomer().catch(() => null)

  if (!customer) {
    return null
  }

  return readRefundBankAccountFromMetadata(
    (customer.metadata ?? null) as Record<string, unknown> | null
  )
}

export async function saveBankAccount(input: {
  bank_code: string
  bank_name: string
  account_number: string
  account_holder: string
}) {
  const headers = await assertCustomerAuth()
  const customer = await retrieveCustomer()

  if (!customer) {
    throw new Error(
      "로그인이 필요합니다. 계정에 로그인한 뒤 다시 시도해 주세요."
    )
  }

  const metadata = {
    ...(((customer.metadata as Record<string, unknown> | null) ?? {}) as Record<
      string,
      unknown
    >),
  }

  const bankAccount: RefundBankAccount = {
    bank_name: input.bank_name,
    bank_code: input.bank_code,
    account_number: input.account_number.trim(),
    account_number_masked: maskAccountNumber(input.account_number),
    account_holder: input.account_holder,
    registered_at: new Date().toISOString(),
  }

  await sdk.store.customer
    .update(
      {
        metadata: {
          ...metadata,
          refund_bank_account: bankAccount,
        },
      },
      {},
      headers
    )
    .catch(throwOnUnauthorized)

  return bankAccount
}

export async function submitParticipationReview(
  participantId: string,
  input: {
    rating: number
    comment?: string
  }
) {
  const response = await authedFetch<{
    review: {
      rating: number
      comment: string | null
      created_at: string
    }
  }>(`/store/me/group-deals/participations/${participantId}/review`, {
    method: "POST",
    body: input,
  }).catch(medusaError)

  return response.review
}

export async function submitParticipationDispute(
  participantId: string,
  input: {
    reason: string
    details?: string
  }
) {
  const response = await authedFetch<{
    dispute: {
      reason: string
      details: string | null
      status: string
      created_at: string
    }
  }>(`/store/me/group-deals/participations/${participantId}/dispute`, {
    method: "POST",
    body: input,
  }).catch(medusaError)

  return response.dispute
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

export async function cancelMyParticipation(participantId: string) {
  try {
    const response = await authedFetch<{ participation: AccountParticipation }>(
      `/store/me/group-deals/participations/${participantId}/cancel`,
      {
        method: "POST",
      }
    )

    return response
  } catch (error) {
    if (isMockFallbackEnabled()) {
      console.warn(
        "[participations] Cancel participation API unavailable, using mock fallback.",
        error
      )

      return {
        participation: {
          ...(getMockParticipations().find(
            (participation) => participation.participant_id === participantId
          ) ?? getMockParticipations()[0]),
          status: "cancelled",
        },
      }
    }

    return throwOnUnauthorized(error)
  }
}

export async function retrievePriceRecommendations(dealId: string) {
  return authedFetch<{
    group_deal_id: string
    disclaimer: string
    recommendations: import("types/account-group-deals").OptionPriceRecommendation[]
  }>(`/store/me/group-deals/${dealId}/price-recommendations`).catch(medusaError)
}

export async function applyPriceRecommendations(
  dealId: string,
  options: Array<{ option_id: string; deal_price: number }>
) {
  const response = await authedFetch<{
    updated: Array<{ option_id: string; deal_price: number }>
    recommendations: import("types/account-group-deals").OptionPriceRecommendation[]
  }>(`/store/me/group-deals/${dealId}/apply-price-recommendations`, {
    method: "POST",
    body: { options },
  }).catch(medusaError)

  return response
}

export async function retrieveLeaderTrustProfile() {
  try {
    const response = await authedFetch<{
      profile: import("types/account-group-deals").LeaderTrustProfile
    }>("/store/me/trust-profile")

    return response.profile
  } catch {
    return null
  }
}

export async function reportLeaderReview(reviewId: string, reason?: string) {
  return authedFetch<{ review: Record<string, unknown> }>(
    `/store/me/trust-profile/reviews/${reviewId}/report`,
    {
      method: "POST",
      body: { reason },
    }
  ).catch(medusaError)
}
