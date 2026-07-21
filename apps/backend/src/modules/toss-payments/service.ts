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
  assertTossPaymentsOptions,
  createTossPaymentsClient,
  TossPaymentsClient,
} from "./client"
import type {
  TossEasyPayMethod,
  TossPaymentSessionData,
  TossPaymentsProviderOptions,
} from "./types"

type InjectedDependencies = {
  logger: Logger
}

const DEFAULT_SUPPORTED_COUNTRIES = ["kr"]

/**
 * 토스페이먼츠 커스텀 결제 프로바이더 (한국 리전 전용)
 *
 * - 일반 체크아웃: 결제위젯 연동
 * - 공동구매: 빌링키 예약 → 목표 달성 후 capture
 *
 * 등록 후 provider_id: `pp_toss-payments_toss-payments`
 *
 * 웹훅: POST /hooks/payment/toss-payments
 */
export class TossPaymentsProviderService extends AbstractPaymentProvider<TossPaymentsProviderOptions> {
  static identifier = "toss-payments"

  protected logger_: Logger
  protected options_: TossPaymentsProviderOptions
  protected client_: TossPaymentsClient

  static validateOptions(options: Record<string, unknown>): void {
    assertTossPaymentsOptions(options as TossPaymentsProviderOptions)
  }

  constructor(
    container: InjectedDependencies,
    options: TossPaymentsProviderOptions
  ) {
    super(container, options)

    this.logger_ = container.logger
    this.options_ = {
      supportedCountries: DEFAULT_SUPPORTED_COUNTRIES,
      ...options,
    }
    this.client_ = createTossPaymentsClient(this.options_)
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    this.assertKoreaPaymentContext(input)

    const billingMode = this.isBillingReservationMode(input)
    const easyPayMethods = this.resolveEasyPayMethods()
    const amount = this.normalizeAmount(input.amount, input.currency_code)
    const context = readPaymentProviderContext(input.context)

    if (billingMode) {
      const customerKey = this.resolveCustomerKey(input)
      const orderId = this.resolveOrderId(input)

      const billingAuth = await this.client_.createBillingAuthSession({
        customerKey,
        orderId,
        amount,
        currencyCode: input.currency_code,
        customerEmail: context.customer?.email,
      })

      return {
        id: billingAuth.orderId,
        data: {
          mode: "billing_reservation",
          provider: "toss-payments",
          customerKey: billingAuth.customerKey,
          orderId: billingAuth.orderId,
          amount: billingAuth.amount,
          currency_code: billingAuth.currencyCode,
          clientKey: billingAuth.clientKey,
          status: "billing_reserved",
          widgetVariant: "payment-widget",
          flowMode: "BILLING",
          easy_pay_methods: easyPayMethods,
          capture_deferred: true,
        },
      }
    }

    const orderId = this.resolveOrderId(input)

    const widgetSession = await this.client_.createWidgetSession({
      orderId,
      amount,
      currencyCode: input.currency_code,
      orderName: this.resolveOrderName(input),
      customerEmail: context.customer?.email,
      customerName: [
        context.customer?.billing_address?.first_name,
        context.customer?.billing_address?.last_name,
      ]
        .filter(Boolean)
        .join(" "),
      easyPayMethods,
      flowMode: "DEFAULT",
    })

    return {
      id: orderId,
      data: {
        mode: "widget",
        provider: "toss-payments",
        orderId: widgetSession.orderId,
        amount: widgetSession.amount,
        currency_code: widgetSession.currencyCode,
        clientKey: widgetSession.clientKey,
        status: "pending",
        widgetVariant: widgetSession.widgetVariant,
        flowMode: widgetSession.flowMode,
        easy_pay_methods: widgetSession.easyPayMethods,
        session_id: input.data?.session_id,
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    this.assertKoreaPaymentContext(input)

    if (this.isBillingReservationMode(input)) {
      const context = readPaymentProviderContext(input.context)
      const customerKey =
        (input.data?.customerKey as string | undefined) ||
        context.customer_key
      const authKey = input.data?.authKey as string | undefined

      if (!customerKey || !authKey) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Toss billing reservation requires customerKey and authKey"
        )
      }

      const billingKeyResult = await this.client_.issueBillingKey({
        customerKey,
        authKey,
      })

      return {
        status: PaymentSessionStatus.AUTHORIZED,
        data: {
          mode: "billing_reservation",
          provider: "toss-payments",
          customerKey: billingKeyResult.customerKey,
          orderId: String(input.data?.orderId ?? billingKeyResult.orderId),
          billingKey: billingKeyResult.billingKey,
          status: "billing_reserved",
          capture_deferred: true,
        },
      }
    }

    const orderId = String(input.data?.orderId ?? "")
    const paymentKey = String(input.data?.paymentKey ?? "")
    const context = readPaymentProviderContext(input.context)
    const amount = Number(input.data?.amount ?? context.amount ?? 0)

    if (!orderId || !paymentKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Toss payment confirmation requires orderId and paymentKey"
      )
    }

    const confirmed = await this.client_.confirmPayment({
      orderId,
      paymentKey,
      amount,
    })

    return {
      status: PaymentSessionStatus.AUTHORIZED,
      data: this.toProviderData(confirmed),
    }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const session = this.parseProviderData(input.data)

    const canceled = await this.client_.cancelPayment({
      orderId: session.orderId,
      paymentKey: session.paymentKey,
      reason: "order_canceled",
    })

    return {
      data: this.toProviderData(canceled),
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const rawBody = payload.rawData
    const body =
      typeof rawBody === "string"
        ? rawBody
        : Buffer.isBuffer(rawBody)
          ? rawBody.toString("utf8")
          : JSON.stringify(payload.data ?? {})

    const signature = this.extractWebhookSignature(payload.headers ?? {})
    const isValid = this.client_.verifyWebhookSignature({
      rawBody: body,
      signature,
      headers: this.normalizeHeaders(payload.headers ?? {}),
    })

    if (!isValid) {
      return {
        action: PaymentActions.FAILED,
        data: {
          session_id: "",
          amount: 0,
        },
      }
    }

    const event = this.client_.parseWebhookPayload(
      (payload.data ?? {}) as Record<string, unknown>
    )

    if (event.eventType === "payment.captured") {
      return {
        action: PaymentActions.SUCCESSFUL,
        data: {
          session_id: event.orderId ?? "",
          amount: event.amount ?? 0,
        },
      }
    }

    if (event.eventType === "payment.canceled") {
      return {
        action: PaymentActions.CANCELED,
        data: {
          session_id: event.orderId ?? "",
          amount: event.amount ?? 0,
        },
      }
    }

    if (event.eventType === "payment.authorized") {
      return {
        action: PaymentActions.AUTHORIZED,
        data: {
          session_id: event.orderId ?? "",
          amount: event.amount ?? 0,
        },
      }
    }

    return {
      action: PaymentActions.NOT_SUPPORTED,
      data: {
        session_id: event.orderId ?? "",
        amount: event.amount ?? 0,
      },
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const session = this.parseProviderData(input.data)

    if (
      input.data?.capture_deferred === true ||
      session.status === "billing_reserved"
    ) {
      return {
        data: this.toProviderData({
          ...session,
          status: "billing_reserved",
        }),
      }
    }

    if (session.billingKey && session.customerKey) {
      const captured = await this.client_.captureWithBillingKey({
        billingKey: session.billingKey,
        customerKey: session.customerKey,
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
      case "authorized":
      case "billing_reserved":
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
      `[toss-payments] Refund requested for order ${session.orderId}, amount=${input.amount}`
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
    this.assertKoreaPaymentContext(input)

    const context = readPaymentProviderContext(input.context)
    const orderId = this.resolveOrderId(input)
    const amount = this.normalizeAmount(input.amount, input.currency_code)

    const widgetSession = await this.client_.createWidgetSession({
      orderId,
      amount,
      currencyCode: input.currency_code,
      customerEmail: context.customer?.email,
      flowMode: "DEFAULT",
    })

    return {
      data: {
        mode: "widget",
        provider: "toss-payments",
        orderId: widgetSession.orderId,
        amount: widgetSession.amount,
        currency_code: widgetSession.currencyCode,
        clientKey: widgetSession.clientKey,
        status: "pending",
        widgetVariant: widgetSession.widgetVariant,
        flowMode: widgetSession.flowMode,
        easy_pay_methods: widgetSession.easyPayMethods,
      },
    }
  }

  protected assertKoreaPaymentContext(input: {
    currency_code?: string
    context?: InitiatePaymentInput["context"]
  }): void {
    const currency = String(input.currency_code ?? "").toLowerCase()

    if (currency !== "krw") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Toss Payments is only available for Korea region (KRW)"
      )
    }

    const context = readPaymentProviderContext(input.context)
    const countryCode = String(
      context.country_code ?? context.billing_address?.country_code ?? ""
    ).toLowerCase()

    const supportedCountries =
      this.options_.supportedCountries ?? DEFAULT_SUPPORTED_COUNTRIES

    if (countryCode && !supportedCountries.includes(countryCode)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Toss Payments is not enabled for country: ${countryCode}`
      )
    }
  }

  protected isBillingReservationMode(input: {
    data?: Record<string, unknown>
    context?: InitiatePaymentInput["context"]
  }): boolean {
    if (input.data?.mode === "billing_reservation") {
      return true
    }

    const context = readPaymentProviderContext(input.context)

    if (context.billing_mode === "reservation") {
      return true
    }

    return context.group_deal?.billing_reservation === true
  }

  protected resolveEasyPayMethods(): TossEasyPayMethod[] {
    return (
      this.options_.enabledEasyPayMethods ?? ["naverpay", "kakaopay", "tosspay"]
    )
  }

  protected resolveCustomerKey(input: {
    context?: InitiatePaymentInput["context"]
  }): string {
    const context = readPaymentProviderContext(input.context)

    return (
      context.customer_key ??
      (context.group_deal?.billing_customer_key as string | undefined) ??
      context.customer?.id ??
      crypto.randomUUID()
    )
  }

  protected resolveOrderId(input: {
    data?: Record<string, unknown>
    context?: InitiatePaymentInput["context"]
  }): string {
    const context = readPaymentProviderContext(input.context)

    return (
      (input.data?.session_id as string | undefined) ??
      (context.idempotency_key as string | undefined) ??
      crypto.randomUUID()
    )
  }

  protected resolveOrderName(input: InitiatePaymentInput): string {
    const context = readPaymentProviderContext(input.context)

    if (context.group_deal?.title) {
      return String(context.group_deal.title)
    }

    return "Medusa Store Order"
  }

  protected normalizeAmount(
    amount: BigNumberInput,
    currencyCode: string
  ): number {
    const numericAmount = toNumericPaymentAmount(amount)

    if (Number.isNaN(numericAmount)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid payment amount: ${amount}`
      )
    }

    if (currencyCode.toLowerCase() === "krw") {
      return Math.round(numericAmount)
    }

    return numericAmount
  }

  protected toProviderData(
    session: TossPaymentSessionData
  ): Record<string, unknown> {
    return {
      id: session.id,
      provider: "toss-payments",
      orderId: session.orderId,
      amount: session.amount,
      currency_code: session.currency_code,
      status: session.status,
      paymentKey: session.paymentKey,
      transactionId: session.transactionId,
      billingKey: session.billingKey,
      customerKey: session.customerKey,
      metadata: session.metadata,
      capture_deferred: session.metadata?.capture_deferred,
      easy_pay_methods: session.metadata?.easyPayMethods,
    }
  }

  protected parseProviderData(
    data: Record<string, unknown> | undefined
  ): TossPaymentSessionData {
    if (!data?.orderId && !data?.id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Toss payment session data is missing orderId"
      )
    }

    return {
      id: String(data.id ?? data.orderId),
      orderId: String(data.orderId ?? data.id),
      amount: Number(data.amount ?? 0),
      currency_code: String(data.currency_code ?? "krw"),
      status: (data.status as TossPaymentSessionData["status"]) ?? "pending",
      paymentKey: data.paymentKey as string | undefined,
      transactionId: data.transactionId as string | undefined,
      billingKey: data.billingKey as string | undefined,
      customerKey: data.customerKey as string | undefined,
      metadata: data.metadata as Record<string, unknown> | undefined,
    }
  }

  protected extractWebhookSignature(
    headers: Record<string, unknown>
  ): string | undefined {
    const normalized = this.normalizeHeaders(headers)

    return (
      normalized["tosspayments-signature"] ||
      normalized["x-toss-signature"] ||
      normalized["x-webhook-signature"]
    )
  }

  protected normalizeHeaders(
    headers: Record<string, unknown>
  ): Record<string, string> {
    return Object.entries(headers ?? {}).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        acc[key.toLowerCase()] = Array.isArray(value)
          ? String(value[0])
          : String(value)
        return acc
      },
      {}
    )
  }
}

export default TossPaymentsProviderService
