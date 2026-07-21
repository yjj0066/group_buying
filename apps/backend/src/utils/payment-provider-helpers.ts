import type {
  BigNumberInput,
  PaymentProviderContext,
} from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

export type ExtendedPaymentProviderContext = PaymentProviderContext & {
  customer_key?: string
  billing_mode?: string
  idempotency_key?: string
  group_deal?: Record<string, unknown>
  amount?: number
  country_code?: string
  billing_address?: {
    country_code?: string
    first_name?: string
    last_name?: string
  }
  customer?: PaymentProviderContext["customer"] & {
    id?: string
    billing_address?: {
      first_name?: string
      last_name?: string
      country_code?: string
    }
  }
}

export const readPaymentProviderContext = (
  context?: PaymentProviderContext | null
): ExtendedPaymentProviderContext =>
  (context ?? {}) as ExtendedPaymentProviderContext

export const toNumericPaymentAmount = (
  amount: BigNumberInput,
  label = "Payment amount"
): number => {
  const raw =
    typeof amount === "object" &&
    amount !== null &&
    "value" in amount &&
    (amount as { value?: string | number }).value != null
      ? (amount as { value: string | number }).value
      : amount

  const numericAmount = Number(raw)

  if (!Number.isFinite(numericAmount)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${label} must be a valid number`
    )
  }

  return numericAmount
}
