import { MedusaError } from "@medusajs/framework/utils"

import {
  createTestWebhookSignature,
  verifyTossWebhookSignature,
} from "../../utils/korean-pg-webhook-signature"
import type {
  TossBillingAuthSession,
  TossBillingCaptureInput,
  TossBillingKeyResult,
  TossPaymentSessionData,
  TossPaymentsProviderOptions,
  TossWebhookEvent,
  TossWidgetSession,
  TossWidgetSessionInput,
} from "./types"

const TOSS_API_BASE_URL = "https://api.tosspayments.com"

/**
 * 토스페이먼츠 REST API 클라이언트
 *
 * - 결제위젯: 스토어프론트 SDK + 서버 confirm
 * - 빌링키: 공동구매 예약 결제(목표 달성 후 capture)
 *
 * @see https://docs.tosspayments.com/
 */
export class TossPaymentsClient {
  protected readonly options: TossPaymentsProviderOptions

  constructor(options: TossPaymentsProviderOptions) {
    this.options = options
  }

  get clientKey(): string {
    return this.options.clientKey
  }

  /**
   * 결제위젯 세션 메타데이터 생성
   *
   * 스토어프론트에서 `@tosspayments/payment-widget-sdk`로 렌더링할 때
   * `clientKey`, `orderId`, `amount` 등을 사용합니다.
   */
  async createWidgetSession(
    input: TossWidgetSessionInput
  ): Promise<TossWidgetSession> {
    const easyPayMethods =
      input.easyPayMethods ??
      this.options.enabledEasyPayMethods ?? ["naverpay", "kakaopay", "tosspay"]

    return {
      orderId: input.orderId,
      amount: input.amount,
      currencyCode: input.currencyCode,
      clientKey: this.options.clientKey,
      widgetVariant: "payment-widget",
      flowMode: input.flowMode ?? "DEFAULT",
      easyPayMethods,
    }
  }

  /**
   * 빌링키 발급(카드 등록) 인증 세션
   *
   * 공동구매 참여 시 1차금 예약용. 실결제는 minimum_reached 이후 capture.
   */
  async createBillingAuthSession(input: {
    customerKey: string
    orderId: string
    amount: number
    currencyCode: string
    customerEmail?: string
  }): Promise<TossBillingAuthSession> {
    this.assertKrwCurrency(input.currencyCode)

    return {
      customerKey: input.customerKey,
      orderId: input.orderId,
      amount: input.amount,
      currencyCode: input.currencyCode,
      clientKey: this.options.clientKey,
    }
  }

  /**
   * authKey로 빌링키 발급
   *
   * POST /v1/billing/authorizations/issue
   */
  async issueBillingKey(input: {
    customerKey: string
    authKey: string
  }): Promise<TossBillingKeyResult> {
    if (this.options.testMode && !this.options.secretKey) {
      return {
        billingKey: `billing_test_${input.customerKey}`,
        customerKey: input.customerKey,
        orderId: `order_test_${input.customerKey}`,
      }
    }

    const response = await this.request<{
      billingKey?: string
      customerKey?: string
    }>("/v1/billing/authorizations/issue", {
      method: "POST",
      body: {
        customerKey: input.customerKey,
        authKey: input.authKey,
      },
    })

    if (!response.billingKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Toss billing key issuance failed"
      )
    }

    return {
      billingKey: response.billingKey,
      customerKey: response.customerKey ?? input.customerKey,
      orderId: input.customerKey,
    }
  }

  /**
   * 빌링키로 실결제 승인 (공동구매 일괄 캡처)
   *
   * POST /v1/billing/{billingKey}
   */
  async captureWithBillingKey(
    input: TossBillingCaptureInput
  ): Promise<TossPaymentSessionData> {
    this.assertKrwCurrency(input.currencyCode)

    if (!input.billingKey?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Billing key is required for capture"
      )
    }

    if (this.options.testMode && input.billingKey.startsWith("billing_test_")) {
      return {
        id: input.orderId,
        orderId: input.orderId,
        amount: input.amount,
        currency_code: input.currencyCode,
        status: "captured",
        billingKey: input.billingKey,
        customerKey: input.customerKey,
        paymentKey: `pay_test_${input.orderId}`,
        transactionId: `txn_test_${input.orderId}_${Date.now()}`,
        metadata: {
          orderName: input.orderName,
          customerEmail: input.customerEmail,
          captureMode: "billing_key",
        },
      }
    }

    const response = await this.request<{
      paymentKey?: string
      orderId?: string
      totalAmount?: number
      status?: string
    }>(`/v1/billing/${encodeURIComponent(input.billingKey)}`, {
      method: "POST",
      body: {
        customerKey: input.customerKey,
        amount: input.amount,
        orderId: input.orderId,
        orderName: input.orderName ?? "Group deal payment",
        customerEmail: input.customerEmail,
      },
    })

    return {
      id: input.orderId,
      orderId: response.orderId ?? input.orderId,
      amount: response.totalAmount ?? input.amount,
      currency_code: input.currencyCode,
      status: mapTossPaymentStatus(response.status),
      billingKey: input.billingKey,
      customerKey: input.customerKey,
      paymentKey: response.paymentKey,
      transactionId: response.paymentKey,
    }
  }

  /**
   * 결제 승인 (결제위젯 successUrl 이후)
   *
   * POST /v1/payments/confirm
   */
  async confirmPayment(input: {
    orderId: string
    paymentKey: string
    amount: number
  }): Promise<TossPaymentSessionData> {
    if (this.options.testMode && input.paymentKey.startsWith("pay_test_")) {
      return {
        id: input.orderId,
        orderId: input.orderId,
        amount: input.amount,
        currency_code: "krw",
        status: "authorized",
        paymentKey: input.paymentKey,
      }
    }

    const response = await this.request<{
      paymentKey?: string
      orderId?: string
      totalAmount?: number
      status?: string
    }>("/v1/payments/confirm", {
      method: "POST",
      body: {
        paymentKey: input.paymentKey,
        orderId: input.orderId,
        amount: input.amount,
      },
    })

    return {
      id: input.orderId,
      orderId: response.orderId ?? input.orderId,
      amount: response.totalAmount ?? input.amount,
      currency_code: "krw",
      status: mapTossPaymentStatus(response.status),
      paymentKey: response.paymentKey ?? input.paymentKey,
      transactionId: response.paymentKey,
    }
  }

  /**
   * 결제 취소
   *
   * POST /v1/payments/{paymentKey}/cancel
   */
  async cancelPayment(input: {
    orderId: string
    paymentKey?: string
    reason?: string
  }): Promise<TossPaymentSessionData> {
    if (!input.paymentKey?.trim()) {
      return {
        id: input.orderId,
        orderId: input.orderId,
        amount: 0,
        currency_code: "krw",
        status: "canceled",
      }
    }

    if (this.options.testMode && input.paymentKey.startsWith("pay_test_")) {
      return {
        id: input.orderId,
        orderId: input.orderId,
        amount: 0,
        currency_code: "krw",
        status: "canceled",
        paymentKey: input.paymentKey,
      }
    }

    await this.request(`/v1/payments/${encodeURIComponent(input.paymentKey)}/cancel`, {
      method: "POST",
      body: {
        cancelReason: input.reason ?? "order_canceled",
      },
    })

    return {
      id: input.orderId,
      orderId: input.orderId,
      amount: 0,
      currency_code: "krw",
      status: "canceled",
      paymentKey: input.paymentKey,
    }
  }

  /**
   * 결제 환불 (캡처 완료 건)
   */
  async refundPayment(input: {
    orderId: string
    paymentKey: string
    amount?: number
    reason?: string
  }): Promise<TossPaymentSessionData> {
    if (this.options.testMode && input.paymentKey.startsWith("pay_test_")) {
      return {
        id: input.orderId,
        orderId: input.orderId,
        amount: input.amount ?? 0,
        currency_code: "krw",
        status: "canceled",
        paymentKey: input.paymentKey,
      }
    }

    await this.request(
      `/v1/payments/${encodeURIComponent(input.paymentKey)}/cancel`,
      {
        method: "POST",
        body: {
          cancelReason: input.reason ?? "group_deal_refund",
          ...(input.amount != null ? { cancelAmount: input.amount } : {}),
        },
      }
    )

    return {
      id: input.orderId,
      orderId: input.orderId,
      amount: input.amount ?? 0,
      currency_code: "krw",
      status: "canceled",
      paymentKey: input.paymentKey,
    }
  }

  verifyWebhookSignature(input: {
    rawBody: string | Buffer
    signature?: string
    headers?: Record<string, string>
  }): boolean {
    const secret = this.options.webhookSecret

    if (!secret?.trim() || !input.signature?.trim()) {
      return false
    }

    if (this.options.testMode && input.signature === "test_signature") {
      return true
    }

    const rawBody =
      typeof input.rawBody === "string"
        ? input.rawBody
        : input.rawBody.toString("utf8")

    if (this.options.testMode) {
      const expected = createTestWebhookSignature(rawBody, secret)

      if (safeCompare(expected, input.signature)) {
        return true
      }
    }

    const timestamp =
      input.headers?.["tosspayments-timestamp"] ||
      input.headers?.["x-toss-timestamp"]

    return verifyTossWebhookSignature({
      rawBody,
      signature: input.signature,
      secret,
      timestamp,
    })
  }

  parseWebhookPayload(payload: Record<string, unknown>): TossWebhookEvent {
    const data = (payload.data ?? payload) as Record<string, unknown>
    const status = String(data.status ?? payload.status ?? "")

    return {
      eventType: String(
        payload.eventType ?? payload.event ?? mapTossStatusToEventType(status)
      ),
      orderId: String(data.orderId ?? payload.orderId ?? ""),
      paymentKey: String(data.paymentKey ?? payload.paymentKey ?? ""),
      transactionId: String(
        data.transactionKey ?? data.transactionId ?? payload.transactionId ?? ""
      ),
      amount: normalizeAmount(data.totalAmount ?? data.amount ?? payload.amount),
      currencyCode: String(data.currency ?? payload.currency ?? "KRW"),
      status,
      rawPayload: payload,
    }
  }

  protected async request<T>(
    path: string,
    init: {
      method: "GET" | "POST" | "DELETE"
      body?: Record<string, unknown>
    }
  ): Promise<T> {
    if (!this.options.secretKey?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Toss Payments secret key is required for server API calls"
      )
    }

    const authorization = Buffer.from(`${this.options.secretKey}:`).toString(
      "base64"
    )

    const response = await fetch(`${TOSS_API_BASE_URL}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    })

    const data = (await response.json().catch(() => ({}))) as T & {
      code?: string
      message?: string
    }

    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Toss API ${path} failed: ${data.message ?? response.statusText}`
      )
    }

    return data
  }

  protected assertKrwCurrency(currencyCode: string): void {
    if (currencyCode.toLowerCase() !== "krw") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Toss Payments provider only supports KRW transactions for Korea region"
      )
    }
  }
}

const safeCompare = (expected: string, actual: string): boolean => {
  const bufferA = Buffer.from(expected)
  const bufferB = Buffer.from(actual)

  if (bufferA.length !== bufferB.length) {
    return false
  }

  return bufferA.equals(bufferB)
}

const normalizeAmount = (value: unknown): number | undefined => {
  if (value == null) {
    return undefined
  }

  const amount = Number(value)

  return Number.isFinite(amount) ? Math.round(amount) : undefined
}

const mapTossPaymentStatus = (
  status?: string
): TossPaymentSessionData["status"] => {
  switch ((status ?? "").toUpperCase()) {
    case "DONE":
    case "PAID":
      return "captured"
    case "CANCELED":
    case "CANCELLED":
      return "canceled"
    case "ABORTED":
    case "EXPIRED":
      return "failed"
    case "IN_PROGRESS":
    case "READY":
      return "authorized"
    default:
      return "pending"
  }
}

const mapTossStatusToEventType = (status: string): string => {
  switch (status.toUpperCase()) {
    case "DONE":
    case "PAID":
      return "payment.captured"
    case "CANCELED":
    case "CANCELLED":
      return "payment.canceled"
    case "ABORTED":
    case "EXPIRED":
      return "payment.failed"
    case "IN_PROGRESS":
    case "READY":
      return "payment.authorized"
    default:
      return "unknown"
  }
}

export const createTossPaymentsClient = (
  options: TossPaymentsProviderOptions
): TossPaymentsClient => {
  return new TossPaymentsClient(options)
}

export const assertTossPaymentsOptions = (
  options: TossPaymentsProviderOptions
): void => {
  if (options.testMode) {
    return
  }

  if (!options.secretKey?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Toss Payments requires `secretKey` in provider options."
    )
  }

  if (!options.clientKey?.trim()) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Toss Payments requires `clientKey` in provider options."
    )
  }
}
