import type { Logger } from "@medusajs/framework/types"
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
  PaymentSessionStatus,
} from "@medusajs/framework/utils"

import {
  assertKoreanPgOptions,
  createKoreanPgClient,
  KoreanPgClient,
} from "./client"
import { createKoreanPgWebhookHandler } from "../../services/korean-pg-webhook-handler"
import type {
  KoreanPgEasyPayMethod,
  KoreanPgPaymentProviderOptions,
  KoreanPgSessionData,
} from "./types"

type InjectedDependencies = {
  logger: Logger
}

/**
 * 국내 PG(토스페이먼츠 / 포트원) 커스텀 결제 프로바이더
 *
 * Medusa v2에서는 v1의 `AbstractPaymentService` 대신
 * `AbstractPaymentProvider`를 상속합니다.
 *
 * 등록 후 provider_id: `pp_korean-pg_korean-pg`
 */
export class KoreanPgPaymentProviderService extends AbstractPaymentProvider<KoreanPgPaymentProviderOptions> {
  static identifier = "korean-pg"

  protected logger_: Logger
  protected options_: KoreanPgPaymentProviderOptions
  protected client_: KoreanPgClient

  static validateOptions(options: Record<string, unknown>): void {
    assertKoreanPgOptions(options as KoreanPgPaymentProviderOptions)
  }

  constructor(
    container: InjectedDependencies,
    options: KoreanPgPaymentProviderOptions
  ) {
    super(container, options)

    this.logger_ = container.logger
    this.options_ = options
    this.client_ = createKoreanPgClient(options)
  }

  /**
   * 결제 세션 생성 (체크아웃에서 결제 수단 선택 시 호출)
   */
  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const billingMode = this.isBillingReservationMode(input)
    const easyPayMethods = this.resolveEasyPayMethods()

    if (billingMode) {
      const customerKey =
        (input.context?.customer_key as string | undefined) ??
        (input.context?.group_deal as Record<string, unknown> | undefined)
          ?.billing_customer_key as string | undefined ??
        input.context?.customer?.id ??
        crypto.randomUUID()
      const orderId =
        (input.data?.session_id as string | undefined) ??
        (input.context?.idempotency_key as string | undefined) ??
        crypto.randomUUID()
      const amount = this.normalizeAmount(input.amount, input.currency_code)

      const billingAuth = await this.client_.createBillingAuthSession({
        customerKey,
        orderId,
        amount,
        currencyCode: input.currency_code,
        customerEmail: input.context?.customer?.email,
      })

      return {
        id: billingAuth.orderId,
        data: {
          mode: "billing_reservation",
          vendor: billingAuth.vendor,
          customerKey: billingAuth.customerKey,
          orderId: billingAuth.orderId,
          amount: billingAuth.amount,
          currency_code: billingAuth.currencyCode,
          clientKey: billingAuth.clientKey ?? this.options_.tossClientKey,
          status: "billing_reserved",
          easy_pay_methods: easyPayMethods,
          /**
           * 공동구매 빌링키 예약:
           * - min_participants 달성 전까지 실결제(Capture) 없음
           * - order.placed 후 confirmGroupDealParticipationWorkflow가 RESERVED 처리
           * - minimum_reached/closed 시 captureGroupDealPaymentsWorkflow가 일괄 승인
           */
          capture_deferred: true,
        },
      }
    }

    const orderId =
      (input.data?.session_id as string | undefined) ??
      (input.context?.idempotency_key as string | undefined) ??
      crypto.randomUUID()
    const amount = this.normalizeAmount(input.amount, input.currency_code)

    const session = await this.client_.createPaymentSession({
      orderId,
      amount,
      currencyCode: input.currency_code,
      customerEmail: input.context?.customer?.email,
      customerName: [
        input.context?.customer?.billing_address?.first_name,
        input.context?.customer?.billing_address?.last_name,
      ]
        .filter(Boolean)
        .join(" "),
      easyPayMethods,
    })

    return {
      id: session.id,
      data: {
        ...this.toProviderData(session),
        session_id: input.data?.session_id,
        clientKey: this.options_.tossClientKey,
        easy_pay_methods: easyPayMethods,
      },
    }
  }

  /**
   * 결제 승인 (주문 완료 직전 호출)
   *
   * 스토어프론트에서 PG 결제 완료 후 전달한 paymentKey 등은
   * `input.data` 또는 `input.context`에 담겨 옵니다.
   */
  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const billingMode = this.isBillingReservationMode(input)

    if (billingMode) {
      const customerKey =
        (input.data?.customerKey as string | undefined) ||
        (input.context?.customer_key as string | undefined)

      const orderId = String(
        input.data?.orderId ?? input.context?.idempotency_key ?? ""
      )

      if (!customerKey || !orderId) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Billing reservation requires customerKey and orderId"
        )
      }

      const billingKeyResult = await this.client_.issueBillingKey({
        customerKey,
        orderId,
        authKey: input.data?.authKey as string | undefined,
        billingKey: input.data?.billingKey as string | undefined,
      })

      return {
        status: PaymentSessionStatus.AUTHORIZED,
        data: {
          mode: "billing_reservation",
          vendor: billingKeyResult.vendor,
          customerKey: billingKeyResult.customerKey,
          orderId: billingKeyResult.orderId,
          billingKey: billingKeyResult.billingKey,
          status: "billing_reserved",
          capture_deferred: true,
        },
      }
    }

    const session = this.parseProviderData(input.data)
    const paymentKey = input.data?.paymentKey as string | undefined

    const confirmed = await this.client_.confirmPayment({
      orderId: session.orderId,
      paymentKey,
      amount: session.amount,
    })

    return {
      status: PaymentSessionStatus.AUTHORIZED,
      data: this.toProviderData(confirmed),
    }
  }

  /**
   * 결제 취소 (주문 취소 시, 캡처 전)
   */
  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const session = this.parseProviderData(input.data)

    const canceled = await this.client_.cancelPayment({
      orderId: session.orderId,
      paymentKey: session.paymentKey,
      transactionId: session.transactionId,
      reason: "order_canceled",
    })

    return {
      data: this.toProviderData(canceled),
    }
  }

  /**
   * 웹훅 처리
   *
   * Medusa 기본 엔드포인트:
   * POST /hooks/payment/korean-pg
   */
  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const handler = createKoreanPgWebhookHandler(
      this.container as { resolve: <T>(key: string) => T; logger?: Logger },
      this.options_
    )

    const result = await handler.processWebhook(payload)

    return {
      action: result.action,
      data: result.data,
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const session = this.parseProviderData(input.data)

    /**
     * 빌링키 예약(capture_deferred)은 complete-cart 시점이 아니라
     * 공동구매 minimum_reached/closed 이후 captureGroupDealPaymentsWorkflow에서 처리합니다.
     */
    if (
      input.data?.capture_deferred === true ||
      session.metadata?.capture_deferred === true ||
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

    // TODO: PG사 환불 API 연동
    this.logger_.info(
      `[korean-pg] Refund requested for order ${session.orderId}, amount=${input.amount}`
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
    const orderId =
      (input.data?.orderId as string | undefined) ?? crypto.randomUUID()
    const amount = this.normalizeAmount(input.amount, input.currency_code)

    const session = await this.client_.createPaymentSession({
      orderId,
      amount,
      currencyCode: input.currency_code,
      customerEmail: input.context?.customer?.email,
    })

    return {
      data: this.toProviderData(session),
    }
  }

  protected isBillingReservationMode(input: {
    data?: Record<string, unknown>
    context?: Record<string, unknown>
  }): boolean {
    if (input.data?.mode === "billing_reservation") {
      return true
    }

    if (input.context?.billing_mode === "reservation") {
      return true
    }

    const groupDeal = input.context?.group_deal as
      | Record<string, unknown>
      | undefined

    return groupDeal?.billing_reservation === true
  }

  protected resolveEasyPayMethods(): KoreanPgEasyPayMethod[] {
    return (
      this.options_.enabledEasyPayMethods ?? [
        "naverpay",
        "kakaopay",
        "tosspay",
      ]
    )
  }

  protected normalizeAmount(
    amount: number | string,
    currencyCode: string
  ): number {
    const numericAmount = Number(amount)

    if (Number.isNaN(numericAmount)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid payment amount: ${amount}`
      )
    }

    // KRW 등 소수 통화는 Medusa BigNumber 단위 그대로 사용
    if (currencyCode.toLowerCase() === "krw") {
      return Math.round(numericAmount)
    }

    return numericAmount
  }

  protected toProviderData(
    session: KoreanPgSessionData
  ): Record<string, unknown> {
    return {
      id: session.id,
      vendor: session.vendor,
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
  ): KoreanPgSessionData {
    if (!data?.orderId && !data?.id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Korean PG payment session data is missing orderId"
      )
    }

    return {
      id: String(data.id ?? data.orderId),
      vendor: (data.vendor as KoreanPgSessionData["vendor"]) ?? this.options_.vendor,
      orderId: String(data.orderId ?? data.id),
      amount: Number(data.amount ?? 0),
      currency_code: String(data.currency_code ?? "krw"),
      status:
        (data.status as KoreanPgSessionData["status"]) ?? "pending",
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
    const normalized = Object.entries(headers ?? {}).reduce<
      Record<string, string>
    >((acc, [key, value]) => {
      acc[key.toLowerCase()] = Array.isArray(value)
        ? String(value[0])
        : String(value)
      return acc
    }, {})

    return (
      normalized["x-toss-signature"] ||
      normalized["x-portone-signature"] ||
      normalized["x-webhook-signature"]
    )
  }
}

export default KoreanPgPaymentProviderService
