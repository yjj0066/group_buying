import Stripe from "stripe"
import { MedusaError } from "@medusajs/framework/utils"

import type {
  StripeGroupDealProviderOptions,
  StripeOffSessionCaptureInput,
  StripePaymentSessionData,
  StripeSetupReservationResult,
  StripeSetupReservationSession,
} from "./types"

export { assertStripeGroupDealOptions } from "./types"

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
])

export const getSmallestUnit = (amount: number, currencyCode: string): number => {
  const currency = currencyCode.toLowerCase()
  const multiplier = ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100

  return Math.round(amount * multiplier)
}

export const createStripeGroupDealClient = (
  options: StripeGroupDealProviderOptions
): StripeGroupDealClient => {
  return new StripeGroupDealClient(options)
}

/**
 * Stripe SetupIntent 기반 공동구매 예약 결제 클라이언트
 *
 * - 참여 시: SetupIntent로 카드만 저장
 * - 목표 달성 시: off-session PaymentIntent로 일괄 승인
 */
export class StripeGroupDealClient {
  protected readonly options: StripeGroupDealProviderOptions
  protected readonly stripe_: Stripe | null

  constructor(options: StripeGroupDealProviderOptions) {
    this.options = options
    this.stripe_ = options.apiKey?.trim()
      ? new Stripe(options.apiKey, { apiVersion: "2024-06-20" })
      : null
  }

  get publishableKey(): string | undefined {
    return this.options.publishableKey
  }

  async createSetupReservationSession(input: {
    orderId: string
    amount: number
    currencyCode: string
    customerEmail?: string
    customerKey?: string
    metadata?: Record<string, string>
  }): Promise<StripeSetupReservationSession> {
    this.assertNonKrwCurrency(input.currencyCode)

    if (this.options.testMode && !this.stripe_) {
      return {
        setupIntentId: `seti_test_${input.orderId}`,
        clientSecret: `seti_test_secret_${input.orderId}`,
        stripeCustomerId: `cus_test_${input.customerKey ?? input.orderId}`,
        orderId: input.orderId,
        amount: input.amount,
        currencyCode: input.currencyCode,
        publishableKey: this.options.publishableKey,
      }
    }

    if (!this.stripe_) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe API key is required"
      )
    }

    const customer = await this.stripe_.customers.create({
      email: input.customerEmail,
      metadata: {
        customer_key: input.customerKey ?? input.orderId,
        order_id: input.orderId,
      },
    })

    const setupIntent = await this.stripe_.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: {
        mode: "setup_reservation",
        order_id: input.orderId,
        amount: String(input.amount),
        currency_code: input.currencyCode,
        ...(input.metadata ?? {}),
      },
    })

    if (!setupIntent.client_secret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe SetupIntent client secret is missing"
      )
    }

    return {
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
      stripeCustomerId: customer.id,
      orderId: input.orderId,
      amount: input.amount,
      currencyCode: input.currencyCode,
      publishableKey: this.options.publishableKey,
    }
  }

  async confirmSetupReservation(input: {
    setupIntentId: string
  }): Promise<StripeSetupReservationResult> {
    if (
      this.options.testMode &&
      input.setupIntentId.startsWith("seti_test_") &&
      !this.stripe_
    ) {
      return {
        setupIntentId: input.setupIntentId,
        stripeCustomerId: `cus_test_${input.setupIntentId}`,
        stripePaymentMethodId: `pm_test_${input.setupIntentId}`,
        status: "setup_reserved",
      }
    }

    if (!this.stripe_) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe API key is required"
      )
    }

    const setupIntent = await this.stripe_.setupIntents.retrieve(
      input.setupIntentId,
      { expand: ["payment_method"] }
    )

    if (setupIntent.status !== "succeeded") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Stripe SetupIntent is not succeeded (status=${setupIntent.status})`
      )
    }

    const paymentMethodId =
      typeof setupIntent.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id

    const customerId =
      typeof setupIntent.customer === "string"
        ? setupIntent.customer
        : setupIntent.customer?.id

    if (!paymentMethodId || !customerId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe SetupIntent is missing customer or payment method"
      )
    }

    return {
      setupIntentId: setupIntent.id,
      stripeCustomerId: customerId,
      stripePaymentMethodId: paymentMethodId,
      status: "setup_reserved",
    }
  }

  async captureOffSession(
    input: StripeOffSessionCaptureInput
  ): Promise<StripePaymentSessionData> {
    this.assertNonKrwCurrency(input.currencyCode)

    if (
      this.options.testMode &&
      input.stripePaymentMethodId.startsWith("pm_test_") &&
      !this.stripe_
    ) {
      return {
        id: input.orderId,
        orderId: input.orderId,
        amount: input.amount,
        currency_code: input.currencyCode,
        status: "captured",
        stripeCustomerId: input.stripeCustomerId,
        stripePaymentMethodId: input.stripePaymentMethodId,
        paymentIntentId: `pi_test_${input.orderId}`,
        transactionId: `txn_test_${input.orderId}_${Date.now()}`,
        mode: "setup_reservation",
      }
    }

    if (!this.stripe_) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe API key is required"
      )
    }

    const paymentIntent = await this.stripe_.paymentIntents.create({
      amount: getSmallestUnit(input.amount, input.currencyCode),
      currency: input.currencyCode.toLowerCase(),
      customer: input.stripeCustomerId,
      payment_method: input.stripePaymentMethodId,
      off_session: true,
      confirm: true,
      description: input.orderName ?? "Group deal payment",
      receipt_email: input.customerEmail,
      metadata: {
        order_id: input.orderId,
        ...(input.metadata ?? {}),
      },
    })

    if (paymentIntent.status !== "succeeded") {
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        `Stripe off-session capture failed (status=${paymentIntent.status})`
      )
    }

    return {
      id: input.orderId,
      orderId: input.orderId,
      amount: input.amount,
      currency_code: input.currencyCode,
      status: "captured",
      stripeCustomerId: input.stripeCustomerId,
      stripePaymentMethodId: input.stripePaymentMethodId,
      paymentIntentId: paymentIntent.id,
      transactionId: paymentIntent.id,
      mode: "setup_reservation",
    }
  }

  /**
   * SetupIntent 예약 해지 (캡처 전 에스크로 해제)
   */
  async cancelSetupReservation(input: {
    setupIntentId: string
  }): Promise<{ setupIntentId: string; status: string }> {
    if (
      this.options.testMode &&
      input.setupIntentId.startsWith("seti_test_") &&
      !this.stripe_
    ) {
      return {
        setupIntentId: input.setupIntentId,
        status: "canceled",
      }
    }

    if (!this.stripe_) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe API key is required"
      )
    }

    const setupIntent = await this.stripe_.setupIntents.cancel(
      input.setupIntentId
    )

    return {
      setupIntentId: setupIntent.id,
      status: setupIntent.status,
    }
  }

  /**
   * 캡처된 PaymentIntent 환불
   */
  async refundCapturedPayment(input: {
    paymentIntentId: string
    amount?: number
    currencyCode: string
    reason?: string
  }): Promise<{ refundId: string; status: string }> {
    if (
      this.options.testMode &&
      input.paymentIntentId.startsWith("pi_test_") &&
      !this.stripe_
    ) {
      return {
        refundId: `re_test_${input.paymentIntentId}`,
        status: "succeeded",
      }
    }

    if (!this.stripe_) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe API key is required"
      )
    }

    const refund = await this.stripe_.refunds.create({
      payment_intent: input.paymentIntentId,
      ...(input.amount != null
        ? {
            amount: getSmallestUnit(input.amount, input.currencyCode),
          }
        : {}),
      metadata: {
        reason: input.reason ?? "group_deal_refund",
      },
    })

    return {
      refundId: refund.id,
      status: refund.status ?? "succeeded",
    }
  }

  protected assertNonKrwCurrency(currencyCode: string): void {
    if (currencyCode.toLowerCase() === "krw") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Stripe group-deal reservation is not available for KRW"
      )
    }
  }
}
