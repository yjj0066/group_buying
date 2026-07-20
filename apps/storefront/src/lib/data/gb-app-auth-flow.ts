"use server"

import { sdk } from "@lib/config"
import { signup, type CustomerAuthState } from "@lib/data/customer"
import { getAuthHeaders } from "@lib/data/cookies"
import { retrieveCustomer } from "@lib/data/customer"
import {
  retrieveGroupBuyingPreferences,
  saveBankAccount,
  updateGroupBuyingPreferences,
} from "@lib/data/account-group-deals"
import { isGbAppOnboardingComplete } from "@lib/util/group-buying-preferences"
import { setGroupBuyingModeCookie } from "@lib/data/group-buying-mode"
import { resolveCountryCode } from "@lib/util/country-code"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { redirect } from "next/navigation"
import type { PreferredRole } from "types/account-group-deals"

export async function hasValidAuthSession(): Promise<boolean> {
  const headers = await getAuthHeaders()

  if (!headers.authorization) {
    return false
  }

  const customer = await retrieveCustomer()

  return customer !== null
}

export async function resolveGbAppEntryRedirect(
  countryCode: string
): Promise<string> {
  const cc = resolveCountryCode(countryCode)
  const valid = await hasValidAuthSession()

  if (!valid) {
    return gbAppRoutes.login(cc)
  }

  const onboardingRedirect = await resolveGbAppOnboardingRedirect(countryCode)

  if (onboardingRedirect) {
    return onboardingRedirect
  }

  return gbAppRoutes.home(cc)
}

export async function resolvePostLoginRedirect(
  countryCode: string,
  options?: { fromSignup?: boolean }
): Promise<string> {
  const cc = resolveCountryCode(countryCode)

  if (options?.fromSignup) {
    return gbAppRoutes.bankAccount(cc)
  }

  const onboardingRedirect = await resolveGbAppOnboardingRedirect(countryCode)

  if (onboardingRedirect) {
    return onboardingRedirect
  }

  return gbAppRoutes.home(cc)
}

export async function resolveGbAppOnboardingRedirect(
  countryCode: string
): Promise<string | null> {
  const customer = await retrieveCustomer()

  if (!customer) {
    return null
  }

  const metadata = (customer.metadata ?? null) as Record<string, unknown> | null
  const preferences = await retrieveGroupBuyingPreferences()

  if (
    isGbAppOnboardingComplete(metadata) ||
    preferences.favorite_idol_group?.trim()
  ) {
    return null
  }

  const cc = resolveCountryCode(countryCode)

  return gbAppRoutes.signup(cc)
}

const applyGbAppSignupPreferences = async (formData: FormData) => {
  const preferredRole =
    (formData.get("preferred_role") as PreferredRole) || "participant"
  const favoriteIdolGroup =
    (formData.get("favorite_idol_group") as string)?.trim() || ""
  const favoriteMember = (formData.get("favorite_member") as string)?.trim() || ""
  const notifyVacancy = formData.get("notify_vacancy") === "on"
  const notifyProgress = formData.get("notify_progress") === "on"
  const marketingOptIn = formData.get("agree_marketing") === "on"

  if (!favoriteIdolGroup) {
    throw new Error("관심 아이돌을 1개 이상 선택해 주세요.")
  }

  await updateGroupBuyingPreferences({
    preferred_role: preferredRole,
    favorite_idol_group: favoriteIdolGroup,
    favorite_member: favoriteMember || favoriteIdolGroup,
    notify_vacancy: notifyVacancy,
    notify_progress: notifyProgress,
    marketing_alerts: marketingOptIn,
  })

  if (marketingOptIn) {
    const headers = await getAuthHeaders()
    const customer = await retrieveCustomer()

    if (customer && headers.authorization) {
      await sdk.store.customer.update(
        {
          metadata: {
            ...(((customer.metadata as Record<string, unknown> | null) ??
              {}) as Record<string, unknown>),
            marketing_opt_in: true,
          },
        },
        {},
        headers
      )
    }
  }

  await setGroupBuyingModeCookie(preferredRole)
}

export async function getGbAppSplashRedirect(
  countryCode: string
): Promise<string> {
  return resolveGbAppEntryRedirect(countryCode)
}

export async function checkNicknameAvailability(
  nickname: string
): Promise<{ available: boolean }> {
  const trimmed = nickname.trim()

  if (!trimmed) {
    return { available: false }
  }

  try {
    const response = await sdk.client.fetch<{ available: boolean }>(
      "/store/signup/nickname-availability",
      {
        method: "GET",
        query: {
          nickname: trimmed,
        },
      }
    )

    return { available: response.available }
  } catch {
    return { available: false }
  }
}

export async function signupGbAppUser(
  _currentState: CustomerAuthState | null,
  formData: FormData
): Promise<CustomerAuthState> {
  const countryCode = resolveCountryCode(
    (formData.get("country_code") as string) || "kr"
  )
  const flowMode = formData.get("flow_mode")

  if (flowMode === "resume") {
    const valid = await hasValidAuthSession()

    if (!valid) {
      return { state: "error", error: "unauthorized" }
    }

    try {
      await applyGbAppSignupPreferences(formData)
    } catch (error) {
      return { state: "error", error: String(error) }
    }

    const preferences = await retrieveGroupBuyingPreferences()

    if (!preferences.favorite_idol_group?.trim()) {
      return {
        state: "error",
        error:
          "관심 아이돌과 역할 설정을 저장하지 못했습니다. 다시 시도해 주세요.",
      }
    }

    redirect(gbAppRoutes.bankAccount(countryCode))
  }

  const signupResult = await signup(_currentState, formData)

  if (signupResult?.state !== "success") {
    return signupResult
  }

  try {
    await applyGbAppSignupPreferences(formData)
  } catch (error) {
    return { state: "error", error: String(error) }
  }

  const preferences = await retrieveGroupBuyingPreferences()

  if (!preferences.favorite_idol_group?.trim()) {
    return {
      state: "error",
      error: "관심 아이돌과 역할 설정을 저장하지 못했습니다. 다시 시도해 주세요.",
    }
  }

  redirect(gbAppRoutes.bankAccount(countryCode))
}

export type BankAccountFormState =
  | { state: "idle" }
  | { state: "error"; error: string }
  | { state: "success" }
  | null

const GB_APP_BANK_NAMES: Record<string, string> = {
  "088": "신한은행",
  "004": "KB국민은행",
  "020": "우리은행",
  "081": "하나은행",
  "090": "카카오뱅크",
  "092": "토스뱅크",
}

const normalizeAccountHolderName = (value: string) =>
  value.trim().replace(/\s+/g, "").toLowerCase()

export async function saveGbAppBankAccount(
  _currentState: BankAccountFormState,
  formData: FormData
): Promise<BankAccountFormState> {
  const bankCode = (formData.get("bank_code") as string)?.trim()
  const bankName =
    (formData.get("bank_name") as string)?.trim() ||
    GB_APP_BANK_NAMES[bankCode] ||
    ""
  const accountNumber = (formData.get("account_number") as string)?.trim()
  const accountHolder = (formData.get("account_holder") as string)?.trim()

  if (!bankCode || !bankName || !accountNumber || !accountHolder) {
    return { state: "error", error: "required_fields" }
  }

  const customer = await retrieveCustomer()

  if (!customer) {
    return { state: "error", error: "unauthorized" }
  }

  const registeredName = customer.first_name?.trim() ?? ""

  if (
    registeredName &&
    normalizeAccountHolderName(accountHolder) !==
      normalizeAccountHolderName(registeredName)
  ) {
    return { state: "error", error: "account_holder_mismatch" }
  }

  try {
    await saveBankAccount({
      bank_code: bankCode,
      bank_name: bankName,
      account_number: accountNumber,
      account_holder: accountHolder,
    })
  } catch (error) {
    return { state: "error", error: String(error) }
  }

  return { state: "success" }
}
