import { TOSS_PAYMENTS_PROVIDER_ID } from "./toss-payments-options"
import { STRIPE_GROUP_DEAL_PROVIDER_ID } from "./stripe-group-deal-options"

export type GroupDealPaymentProviderKind = "toss" | "stripe"

const KOREA_COUNTRY_CODES = new Set(["kr"])

export const resolveGroupDealPaymentProviderKind = (
  countryCode: string
): GroupDealPaymentProviderKind => {
  const normalized = countryCode.trim().toLowerCase()

  if (KOREA_COUNTRY_CODES.has(normalized)) {
    return "toss"
  }

  return "stripe"
}

export const resolveGroupDealPaymentProviderId = (
  countryCode: string
): string => {
  const kind = resolveGroupDealPaymentProviderKind(countryCode)

  return kind === "toss"
    ? TOSS_PAYMENTS_PROVIDER_ID
    : STRIPE_GROUP_DEAL_PROVIDER_ID
}

export const resolvePaymentProviderKindFromId = (
  providerId?: string | null
): GroupDealPaymentProviderKind | null => {
  if (!providerId) {
    return null
  }

  if (providerId === TOSS_PAYMENTS_PROVIDER_ID) {
    return "toss"
  }

  if (providerId === STRIPE_GROUP_DEAL_PROVIDER_ID) {
    return "stripe"
  }

  if (providerId.includes("toss-payments")) {
    return "toss"
  }

  if (providerId.includes("stripe")) {
    return "stripe"
  }

  return null
}
