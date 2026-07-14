import type { StripeGroupDealProviderOptions } from "../modules/stripe-group-deal/types"

/** Medusa에 등록된 Stripe 공동구매 예약 결제 provider_id */
export const STRIPE_GROUP_DEAL_PROVIDER_ID =
  "pp_stripe-group-deal_stripe-group-deal"

export const resolveStripeGroupDealOptionsFromEnv =
  (): StripeGroupDealProviderOptions => {
    return {
      apiKey: process.env.STRIPE_SECRET_KEY ?? "",
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      testMode: process.env.STRIPE_TEST_MODE !== "false",
      supportedCountries: (process.env.STRIPE_SUPPORTED_COUNTRIES ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    }
  }
