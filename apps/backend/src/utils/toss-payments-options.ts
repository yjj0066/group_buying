import type { TossPaymentsProviderOptions } from "../modules/toss-payments/types"

/** Medusa에 등록된 Toss Payments provider_id */
export const TOSS_PAYMENTS_PROVIDER_ID = "pp_toss-payments_toss-payments"

export const resolveTossPaymentsOptionsFromEnv =
  (): TossPaymentsProviderOptions => {
    return {
      secretKey: process.env.TOSS_SECRET_KEY ?? "",
      clientKey: process.env.TOSS_CLIENT_KEY ?? "",
      webhookSecret: process.env.TOSS_WEBHOOK_SECRET,
      testMode: process.env.TOSS_TEST_MODE !== "false",
      supportedCountries: (process.env.TOSS_SUPPORTED_COUNTRIES ?? "kr")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
      enabledEasyPayMethods: [
        "naverpay",
        "kakaopay",
        "tosspay",
        "payco",
      ],
    }
  }
