export type StripeGroupDealProviderOptions = {
  apiKey: string
  publishableKey?: string
  webhookSecret?: string
  testMode?: boolean
  /** 비어 있으면 한국(kr)을 제외한 모든 국가 허용 */
  supportedCountries?: string[]
}

export type StripeSetupReservationSession = {
  setupIntentId: string
  clientSecret: string
  stripeCustomerId: string
  orderId: string
  amount: number
  currencyCode: string
  publishableKey?: string
}

export type StripeSetupReservationResult = {
  setupIntentId: string
  stripeCustomerId: string
  stripePaymentMethodId: string
  status: "setup_reserved"
}

export type StripeOffSessionCaptureInput = {
  stripeCustomerId: string
  stripePaymentMethodId: string
  orderId: string
  amount: number
  currencyCode: string
  orderName?: string
  customerEmail?: string
  metadata?: Record<string, string>
}

export type StripePaymentSessionData = {
  id: string
  orderId: string
  amount: number
  currency_code: string
  status: string
  setupIntentId?: string
  stripeCustomerId?: string
  stripePaymentMethodId?: string
  paymentIntentId?: string
  transactionId?: string
  clientSecret?: string
  publishableKey?: string
  mode?: "setup_reservation" | "widget"
  capture_deferred?: boolean
}

export const assertStripeGroupDealOptions = (
  options: StripeGroupDealProviderOptions
): void => {
  if (!options.apiKey?.trim() && options.testMode !== true) {
    throw new Error("Stripe secret key (apiKey) is required")
  }
}
