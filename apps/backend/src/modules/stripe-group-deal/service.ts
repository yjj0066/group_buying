import type { BigNumberInput, Logger } from "@medusajs/framework/types"
import crypto from "crypto"
import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"

import {
  readPaymentProviderContext,
  toNumericPaymentAmount,
} from "../../utils/payment-provider-helpers"

import {
  assertStripeGroupDealOptions,
  createStripeGroupDealClient,
  StripeGroupDealClient,
} from "./client"
import type {
  StripeGroupDealProviderOptions,
  StripePaymentSessionData,
} from "./types"

type InjectedDependencies = {
  logger: Logger
}

const KOREA_COUNTRY_CODES = new Set(["kr"])

/**
 * Stripe SetupIntent 기반 공동구매 예약 결제 프로바이더 (해외 리전 전용)
 *
 * - 공동구매: SetupIntent로 카드 예약 → 목표 달성 후 off-session 캡처
 *
 * 등록 후 provider_id: `pp_stripe-group-deal_stripe-group-deal`
 */
export class StripeGroupDealProviderService extends AbstractPaymentProvider<StripeGroupDealProviderOptions> {
  static identifier = "stripe-group-deal"

  protected logger_: Logger
  protected options_: StripeGroupDealProviderOptions
  protected client_: StripeGroupDealClient

  static validateOptions(options: Record<string, unknown>): void {
    assertStripeGroupDealOptions(options as StripeGroupDealProviderOptions)
  }

  constructor(
    container: InjectedDependencies,
    options: StripeGroupDealProviderOptions
  ) {
    super(container, options)

    this.logger_ = container.logger
    this.options_ = options
    this.client_ = createStripeGroupDealClient(this.options_)
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    this.assertInternationalPaymentContext(input)

    if (this.isSetupReservationMode(input)) {
      const context = readPaymentProviderContext(input.context)
      const customerKey = this.resolveCustomerKey(input)
      const orderId = this.resolveOrderId(input)
      const amount = this.normalizeAmount(input.amount, input.currency_code)

      const setupSession = await this.client_.createSetupReservationSession({
        orderId,
        amount,
        currencyCode: input.currency_code,
        customerEmail: context.customer?.email,
        customerKey,
        metadata: {
          session_id: String(input.data?.session_id ?? ""),
          group_deal_id: String(context.group_deal?.id ?? ""),
          participant_id: String(context.group_deal?.participant_id ?? ""),
        },
      })

      return {
        id: setupSession.setupIntentId,
        data: {
          mode: "setup_reservation",
          provider: "stripe-group-deal",
          orderId: setupSession.orderId,
          amount: setupSession.amount,
          currency_code: setupSession.currencyCode,
          setupIntentId: setupSession.setupIntentId,
          clientSecret: setupSession.clientSecret,
          stripeCustomerId: setupSession.stripeCustomerId,
          publishableKey: setupSession.publishableKey,
          status: "setup_pending",
          capture_deferred: true,
        },
      }
    }

    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Stripe group-deal provider only supports setup_reservation mode"
    )
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    this.assertInternationalPaymentContext(input)

    if (this.isSetupReservationMode(input)) {
      const setupIntentId = String(
        input.data?.setup_intent_id ??
          input.data?.setupIntentId ??
          input.data?.id ??
          ""
      )

      if (!setupIntentId) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Stripe setup reservation requires setupIntentId"
        )
      }

      const setupResult = await this.client_.confirmSetupReservation({
        setupIntentId,
      })

      return {
        status: PaymentSessionStatus.AUTHORIZED,
        data: {
          mode: "setup_reservation",
          provider: "stripe-group-deal",
          orderId: String(input.data?.orderId ?? setupIntentId),
          setupIntentId: setupResult.setupIntentId,
          stripeCustomerId: setupResult.stripeCustomerId,
          stripePaymentMethodId: setupResult.stripePaymentMethodId,
          status: "setup_reserved",
          capture_deferred: true,
        },
      }
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Stripe group-deal authorization requires setup reservation mode"
    )
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return {
      data: {
        ...(input.data ?? {}),
        status: "canceled",
      },
    }
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return {
      action: PaymentActions.NOT_SUPPORTED,
      data: {
        session_id: "",
        amount: 0,
      },
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const session = this.parseProviderData(input.data)

    if (
      input.data?.capture_deferred === true ||
      session.status === "setup_reserved"
    ) {
      return {
        data: this.toProviderData({
          ...session,
          status: "setup_reserved",
        }),
      }
    }

    if (
      session.stripeCustomerId &&
      session.stripePaymentMethodId &&
      session.orderId
    ) {
      const captured = await this.client_.captureOffSession({
        stripeCustomerId: session.stripeCustomerId,
        stripePaymentMethodId: session.stripePaymentMethodId,
        orderId: session.orderId,
        amount: session.amount,
        currencyCode: session.currency_code,
      })

      return {
        data: this.toProviderData(captured),
      }
    }

    return {
      data: this.toProviderData({
        ...session,
        status: "captured",
      }),
    }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return {
      data: input.data ?? {},
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const session = this.parseProviderData(input.data)

    switch (session.status) {
      case "setup_reserved":
        return { status: PaymentSessionStatus.AUTHORIZED }
      case "captured":
        return { status: PaymentSessionStatus.CAPTURED }
      case "canceled":
        return { status: PaymentSessionStatus.CANCELED }
      case "failed":
        return { status: PaymentSessionStatus.ERROR }
      default:
        return { status: PaymentSessionStatus.PENDING }
    }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const session = this.parseProviderData(input.data)

    this.logger_.info(
      `[stripe-group-deal] Refund requested for order ${session.orderId}, amount=${input.amount}`
    )

    return {
      data: input.data ?? {},
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    return {
      data: input.data ?? {},
    }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    this.assertInternationalPaymentContext(input)

    const context = readPaymentProviderContext(input.context)
    const orderId = this.resolveOrderId(input)
    const amount = this.normalizeAmount(input.amount, input.currency_code)
    const customerKey = this.resolveCustomerKey(input)

    const setupSession = await this.client_.createSetupReservationSession({
      orderId,
      amount,
      currencyCode: input.currency_code,
      customerEmail: context.customer?.email,
      customerKey,
    })

    return {
      data: {
        mode: "setup_reservation",
        provider: "stripe-group-deal",
        orderId: setupSession.orderId,
        amount: setupSession.amount,
        currency_code: setupSession.currencyCode,
        setupIntentId: setupSession.setupIntentId,
        clientSecret: setupSession.clientSecret,
        stripeCustomerId: setupSession.stripeCustomerId,
        publishableKey: setupSession.publishableKey,
        status: "setup_pending",
        capture_deferred: true,
      },
    }
  }

  protected assertInternationalPaymentContext(input: {
    currency_code?: string
    context?: InitiatePaymentInput["context"]
  }): void {
    const currency = String(input.currency_code ?? "").toLowerCase()

    if (currency === "krw") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Stripe group-deal is not available for Korea region (KRW)"
      )
    }

    const context = readPaymentProviderContext(input.context)
    const countryCode = String(
      context.country_code ?? context.billing_address?.country_code ?? ""
    ).toLowerCase()

    if (countryCode && KOREA_COUNTRY_CODES.has(countryCode)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Stripe group-deal is not enabled for Korea"
      )
    }

    const supportedCountries = this.options_.supportedCountries ?? []

    if (
      supportedCountries.length &&
      countryCode &&
      !supportedCountries.includes(countryCode)
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Stripe group-deal is not enabled for country: ${countryCode}`
      )
    }
  }

  protected isSetupReservationMode(input: {
    data?: Record<string, unknown>
    context?: InitiatePaymentInput["context"]
  }): boolean {
    if (input.data?.mode === "setup_reservation") {
      return true
    }

    const context = readPaymentProviderContext(input.context)

    if (context.billing_mode === "reservation") {
      return true
    }

    return context.group_deal?.billing_reservation === true
  }

  protected resolveCustomerKey(input: {
    context?: InitiatePaymentInput["context"]
  }): string {
    const context = readPaymentProviderContext(input.context)

    return context.customer_key ?? context.customer?.id ?? crypto.randomUUID()
  }

  protected resolveOrderId(input: {
    data?: Record<string, unknown>
    context?: InitiatePaymentInput["context"]
  }): string {
    const context = readPaymentProviderContext(input.context)
    const participantId = String(context.group_deal?.participant_id ?? "")

    if (participantId) {
      return `gdeal_setup_${participantId}_${crypto.randomUUID()}`
    }

    return String(
      input.data?.orderId ??
        input.data?.id ??
        `gdeal_setup_${crypto.randomUUID()}`
    )
  }

  protected normalizeAmount(
    amount: BigNumberInput,
    currencyCode: string
  ): number {
    const numericAmount = toNumericPaymentAmount(amount)

    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Payment amount must be a non-negative number"
      )
    }

    if (currencyCode.toLowerCase() === "krw") {
      return Math.round(numericAmount)
    }

    return Math.round(numericAmount * 100) / 100
  }

  protected parseProviderData(
    data: Record<string, unknown> | undefined
  ): StripePaymentSessionData {
    const payload = (data ?? {}) as Record<string, unknown>

    return {
      id: String(payload.id ?? payload.setupIntentId ?? payload.orderId ?? ""),
      orderId: String(payload.orderId ?? payload.id ?? ""),
      amount: Number(payload.amount ?? 0),
      currency_code: String(payload.currency_code ?? ""),
      status: String(payload.status ?? "pending"),
      setupIntentId: payload.setupIntentId as string | undefined,
      stripeCustomerId: payload.stripeCustomerId as string | undefined,
      stripePaymentMethodId: payload.stripePaymentMethodId as string | undefined,
      paymentIntentId: payload.paymentIntentId as string | undefined,
      transactionId: payload.transactionId as string | undefined,
      clientSecret: payload.clientSecret as string | undefined,
      publishableKey: payload.publishableKey as string | undefined,
      mode: payload.mode as "setup_reservation" | "widget" | undefined,
      capture_deferred: payload.capture_deferred === true,
    }
  }

  protected toProviderData(
    session: StripePaymentSessionData
  ): Record<string, unknown> {
    return {
      mode: session.mode ?? "setup_reservation",
      provider: "stripe-group-deal",
      id: session.id,
      orderId: session.orderId,
      amount: session.amount,
      currency_code: session.currency_code,
      status: session.status,
      setupIntentId: session.setupIntentId,
      stripeCustomerId: session.stripeCustomerId,
      stripePaymentMethodId: session.stripePaymentMethodId,
      paymentIntentId: session.paymentIntentId,
      transactionId: session.transactionId,
      clientSecret: session.clientSecret,
      publishableKey: session.publishableKey,
      capture_deferred: session.capture_deferred ?? true,
    }
  }
}

export default StripeGroupDealProviderService
