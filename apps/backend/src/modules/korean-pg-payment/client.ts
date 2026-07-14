import { MedusaError } from "@medusajs/framework/utils"

import {
  createTestWebhookSignature,
  verifyPortoneWebhookSignature,
  verifyTossWebhookSignature,
} from "../../utils/korean-pg-webhook-signature"
import type {
  KoreanPgBillingAuthSession,
  KoreanPgBillingCaptureInput,
  KoreanPgBillingKeyResult,
  KoreanPgPaymentProviderOptions,
  KoreanPgSessionData,
  KoreanPgVendor,
  KoreanPgWebhookEvent,
} from "./types"

/**
 * 토스페이먼츠 / 포트원 REST API 호출 래퍼 (스켈레톤)
 *
 * 실제 연동 시 각 벤더 SDK 또는 API 문서에 맞게 구현하세요.
 */
export class KoreanPgClient {
  protected readonly options: KoreanPgPaymentProviderOptions

  constructor(options: KoreanPgPaymentProviderOptions) {
    this.options = options
  }

  get vendor(): KoreanPgVendor {
    return this.options.vendor
  }

  async createBillingAuthSession(input: {
    customerKey: string
    orderId: string
    amount: number
    currencyCode: string
    customerEmail?: string
  }): Promise<KoreanPgBillingAuthSession> {
    // TODO: vendor별 빌링키 발급(카드 등록) 세션 생성
    // - toss: 빌링키 발급 API (customerKey + authKey)
    // - portone: customer_uid 기반 빌링키 등록
    return {
      customerKey: input.customerKey,
      orderId: input.orderId,
      amount: input.amount,
      currencyCode: input.currencyCode,
      clientKey: this.options.tossClientKey,
      vendor: this.vendor,
    }
  }

  async issueBillingKey(input: {
    customerKey: string
    orderId: string
    authKey?: string
    billingKey?: string
  }): Promise<KoreanPgBillingKeyResult> {
    // TODO: PG사 빌링키 발급 API 호출
    // 테스트 모드에서는 전달된 billingKey 또는 스텁 키 사용
    const billingKey =
      input.billingKey ||
      `billing_${this.vendor}_${input.customerKey}_${input.orderId}`

    return {
      billingKey,
      customerKey: input.customerKey,
      orderId: input.orderId,
      vendor: this.vendor,
    }
  }

  async captureWithBillingKey(
    input: KoreanPgBillingCaptureInput
  ): Promise<KoreanPgSessionData> {
    // TODO: 저장된 빌링키로 실결제 승인(Capture)
    // - toss: POST /v1/billing/{billingKey}
    // - portone: again_payment 또는 schedule API
    if (!input.billingKey?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Billing key is required for capture"
      )
    }

    return {
      id: input.orderId,
      vendor: this.vendor,
      orderId: input.orderId,
      amount: input.amount,
      currency_code: input.currencyCode,
      status: "captured",
      billingKey: input.billingKey,
      customerKey: input.customerKey,
      paymentKey: `pay_${input.orderId}`,
      transactionId: `txn_${input.orderId}_${Date.now()}`,
      metadata: {
        orderName: input.orderName,
        customerEmail: input.customerEmail,
        captureMode: "billing_key",
      },
    }
  }

  async createPaymentSession(input: {
    orderId: string
    amount: number
    currencyCode: string
    customerEmail?: string
    customerName?: string
    easyPayMethods?: string[]
    billingMode?: boolean
  }): Promise<KoreanPgSessionData> {
    // TODO: vendor별 결제 세션(결제창) 생성 API 호출
    // - toss: 결제위젯 SDK — flowMode: BILLING | DEFAULT, easyPay: { useEscrow, ... }
    //   간편결제: naverpay, kakaopay, tosspay (enabledEasyPayMethods)
    // - portone: pg 파라미터 — kakaopay.TC0ONETIME, naverpay, payco 등
    const easyPayMethods = input.easyPayMethods ?? [
      "naverpay",
      "kakaopay",
      "tosspay",
    ]

    return {
      id: input.orderId,
      vendor: this.vendor,
      orderId: input.orderId,
      amount: input.amount,
      currency_code: input.currencyCode,
      status: "pending",
      metadata: {
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        easyPayMethods,
        billingMode: input.billingMode ?? false,
        widgetVariant: this.vendor === "toss" ? "payment-widget" : "checkout",
      },
    }
  }

  async confirmPayment(input: {
    orderId: string
    paymentKey?: string
    amount: number
  }): Promise<KoreanPgSessionData> {
    // TODO: 결제 승인(confirm) API 호출
    // - toss: POST /v1/payments/confirm
    // - portone: GET /payments/{imp_uid} 후 상태 확인
    return {
      id: input.orderId,
      vendor: this.vendor,
      orderId: input.orderId,
      amount: input.amount,
      currency_code: "krw",
      status: "authorized",
      paymentKey: input.paymentKey,
    }
  }

  async cancelPayment(input: {
    orderId: string
    paymentKey?: string
    transactionId?: string
    reason?: string
  }): Promise<KoreanPgSessionData> {
    // TODO: 결제 취소 API 호출
    // - toss: POST /v1/payments/{paymentKey}/cancel
    // - portone: POST /payments/cancel
    return {
      id: input.orderId,
      vendor: this.vendor,
      orderId: input.orderId,
      amount: 0,
      currency_code: "krw",
      status: "canceled",
      paymentKey: input.paymentKey,
      transactionId: input.transactionId,
    }
  }

  verifyWebhookSignature(input: {
    rawBody: string | Buffer
    signature?: string
    headers?: Record<string, string>
    payload?: Record<string, unknown>
  }): boolean {
    const secret = this.options.webhookSecret

    if (!secret?.trim()) {
      return false
    }

    if (!input.signature?.trim()) {
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
      const expectedTestSignature = createTestWebhookSignature(rawBody, secret)

      if (safeCompareSignatures(expectedTestSignature, input.signature)) {
        return true
      }
    }

    if (this.vendor === "toss") {
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

    const impUid = String(
      input.payload?.imp_uid ?? input.payload?.paymentKey ?? ""
    )
    const status = String(input.payload?.status ?? "")

    return verifyPortoneWebhookSignature({
      impUid,
      status,
      signature: input.signature,
      secret,
    })
  }

  parseWebhookPayload(payload: Record<string, unknown>): KoreanPgWebhookEvent {
    if (this.vendor === "toss") {
      return this.parseTossWebhookPayload(payload)
    }

    return this.parsePortoneWebhookPayload(payload)
  }

  protected parseTossWebhookPayload(
    payload: Record<string, unknown>
  ): KoreanPgWebhookEvent {
    const data = (payload.data ?? payload) as Record<string, unknown>
    const status = String(data.status ?? payload.status ?? "")
    const eventType = String(
      payload.eventType ??
        payload.event ??
        mapTossStatusToEventType(status)
    )

    return {
      eventType,
      orderId: String(data.orderId ?? payload.orderId ?? ""),
      paymentKey: String(data.paymentKey ?? payload.paymentKey ?? ""),
      transactionId: String(
        data.transactionKey ?? data.transactionId ?? payload.transactionId ?? ""
      ),
      amount: normalizeWebhookAmount(
        data.totalAmount ?? data.amount ?? payload.amount
      ),
      currencyCode: String(
        data.currency ?? payload.currency ?? payload.currencyCode ?? "KRW"
      ),
      status,
      rawPayload: payload,
    }
  }

  protected parsePortoneWebhookPayload(
    payload: Record<string, unknown>
  ): KoreanPgWebhookEvent {
    const status = String(payload.status ?? "")
    const eventType = String(
      payload.eventType ?? mapPortoneStatusToEventType(status)
    )

    return {
      eventType,
      orderId: String(payload.merchant_uid ?? payload.orderId ?? ""),
      paymentKey: String(payload.imp_uid ?? payload.paymentKey ?? ""),
      transactionId: String(payload.imp_uid ?? payload.transactionId ?? ""),
      amount: normalizeWebhookAmount(payload.amount),
      currencyCode: String(payload.currency ?? payload.currencyCode ?? "KRW"),
      status,
      rawPayload: payload,
    }
  }
}

const safeCompareSignatures = (expected: string, actual: string): boolean => {
  const bufferA = Buffer.from(expected)
  const bufferB = Buffer.from(actual)

  if (bufferA.length !== bufferB.length) {
    return false
  }

  return bufferA.equals(bufferB)
}

const normalizeWebhookAmount = (value: unknown): number | undefined => {
  if (value == null) {
    return undefined
  }

  const amount = Number(value)

  return Number.isFinite(amount) ? Math.round(amount) : undefined
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

const mapPortoneStatusToEventType = (status: string): string => {
  switch (status) {
    case "paid":
      return "PAYMENT_STATUS_CHANGED_PAID"
    case "cancelled":
      return "PAYMENT_STATUS_CHANGED_CANCELLED"
    case "failed":
      return "payment.failed"
    case "ready":
      return "PAYMENT_STATUS_CHANGED_AUTHORIZED"
    default:
      return "unknown"
  }
}

export const createKoreanPgClient = (
  options: KoreanPgPaymentProviderOptions
): KoreanPgClient => {
  return new KoreanPgClient(options)
}

export const assertKoreanPgOptions = (
  options: KoreanPgPaymentProviderOptions
): void => {
  if (!options.vendor) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Korean PG provider requires `vendor` option (`toss` or `portone`)."
    )
  }

  if (options.testMode) {
    return
  }

  if (options.vendor === "toss" && !options.tossSecretKey) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Toss Payments requires `tossSecretKey` in provider options."
    )
  }

  if (
    options.vendor === "portone" &&
    (!options.portoneApiKey || !options.portoneApiSecret)
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PortOne requires `portoneApiKey` and `portoneApiSecret` in provider options."
    )
  }
}
