import { HttpTypes } from "@medusajs/types"

export const TOSS_PAYMENTS_PROVIDER_ID = "pp_toss-payments_toss-payments"
export const STRIPE_GROUP_DEAL_PROVIDER_ID =
  "pp_stripe-group-deal_stripe-group-deal"

export type PaymentSessionData = Record<string, unknown>

export const isTossPayments = (providerId?: string | null): boolean => {
  return !!providerId?.includes("toss-payments")
}

export const isStripeGroupDeal = (providerId?: string | null): boolean => {
  return !!providerId?.includes("stripe-group-deal")
}

export const isStripePaymentIntent = (providerId?: string | null): boolean => {
  return (
    providerId?.startsWith("pp_stripe_") === true ||
    providerId?.startsWith("pp_medusa-") === true
  )
}

export const isStripeCheckout = (providerId?: string | null): boolean => {
  return isStripePaymentIntent(providerId) || isStripeGroupDeal(providerId)
}

export const isGroupDealReservationCart = (
  cart: HttpTypes.StoreCart
): boolean => {
  const metadata = (cart.metadata ?? {}) as Record<string, unknown>

  if (metadata.group_deal_billing_reservation === true) {
    return true
  }

  return (
    cart.items?.some(
      (item) =>
        (item.metadata as Record<string, unknown> | undefined)?.is_group_deal ===
        true
    ) ?? false
  )
}

export const getPreferredPaymentProviderId = (
  cart: HttpTypes.StoreCart
): string | undefined => {
  const metadata = (cart.metadata ?? {}) as Record<string, unknown>

  return metadata.payment_provider_id as string | undefined
}

export const getActivePaymentSession = (
  cart: HttpTypes.StoreCart
): HttpTypes.StorePaymentSession | undefined => {
  return cart.payment_collection?.payment_sessions?.find(
    (session) => session.status === "pending"
  )
}

export const getPaymentSessionData = (
  session?: HttpTypes.StorePaymentSession | null
): PaymentSessionData => {
  return (session?.data ?? {}) as PaymentSessionData
}

export const isTossBillingReservation = (
  session?: HttpTypes.StorePaymentSession | null
): boolean => {
  const data = getPaymentSessionData(session)

  return (
    data.mode === "billing_reservation" ||
    data.flowMode === "BILLING" ||
    data.capture_deferred === true
  )
}

export const isStripeSetupReservation = (
  session?: HttpTypes.StorePaymentSession | null
): boolean => {
  const data = getPaymentSessionData(session)

  return data.mode === "setup_reservation" || data.capture_deferred === true
}

export const resolveStripeClientSecret = (
  session?: HttpTypes.StorePaymentSession | null
): string | undefined => {
  const data = getPaymentSessionData(session)

  return (
    (data.client_secret as string | undefined) ||
    (data.clientSecret as string | undefined)
  )
}

export const resolveStripePublishableKey = (
  session?: HttpTypes.StorePaymentSession | null
): string | undefined => {
  const data = getPaymentSessionData(session)

  return (
    (data.publishableKey as string | undefined) ||
    process.env.NEXT_PUBLIC_STRIPE_KEY ||
    process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY
  )
}

export const resolveTossClientKey = (
  session?: HttpTypes.StorePaymentSession | null
): string | undefined => {
  const data = getPaymentSessionData(session)

  return (
    (data.clientKey as string | undefined) ||
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
  )
}
