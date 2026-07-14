export type KoreanPgVendor = "toss" | "portone"

/**
 * 간편결제 수단
 * - toss: 결제위젯 easyPay 파라미터
 * - portone: pg 파라미터 (kakaopay, naverpay 등)
 */
export type KoreanPgEasyPayMethod =
  | "naverpay"
  | "kakaopay"
  | "tosspay"
  | "payco"
  | "samsungpay"
  | "applepay"

export type KoreanPgPaymentProviderOptions = {
  /**
   * 연동할 PG 벤더
   * - toss: 토스페이먼츠
   * - portone: 포트원(아임포트)
   */
  vendor: KoreanPgVendor

  /** 토스페이먼츠 시크릿 키 (vendor=toss) */
  tossSecretKey?: string

  /** 토스페이먼츠 클라이언트 키 - 스토어프론트 위젯용 (vendor=toss) */
  tossClientKey?: string

  /** 포트원 REST API 키 (vendor=portone) */
  portoneApiKey?: string

  /** 포트원 시크릿 키 (vendor=portone) */
  portoneApiSecret?: string

  /** 포트원 가맹점 식별코드 (vendor=portone) */
  portoneStoreId?: string

  /** 웹훅 서명 검증용 시크릿 */
  webhookSecret?: string

  /** 테스트 모드 여부 */
  testMode?: boolean

  /**
   * 활성화할 간편결제 수단
   * 미지정 시 네이버페이·카카오페이·토스페이 기본 활성화
   */
  enabledEasyPayMethods?: KoreanPgEasyPayMethod[]
}

export type KoreanPgSessionData = {
  id: string
  vendor: KoreanPgVendor
  orderId: string
  amount: number
  currency_code: string
  status:
    | "pending"
    | "authorized"
    | "captured"
    | "canceled"
    | "failed"
    | "billing_reserved"
  paymentKey?: string
  transactionId?: string
  billingKey?: string
  customerKey?: string
  metadata?: Record<string, unknown>
}

export type KoreanPgBillingAuthSession = {
  customerKey: string
  orderId: string
  amount: number
  currencyCode: string
  clientKey?: string
  vendor: KoreanPgVendor
}

export type KoreanPgBillingKeyResult = {
  billingKey: string
  customerKey: string
  orderId: string
  vendor: KoreanPgVendor
}

export type KoreanPgBillingCaptureInput = {
  billingKey: string
  customerKey: string
  orderId: string
  amount: number
  currencyCode: string
  orderName?: string
  customerEmail?: string
}

export type KoreanPgWebhookEvent = {
  eventType: string
  orderId?: string
  paymentKey?: string
  transactionId?: string
  amount?: number
  currencyCode?: string
  status?: string
  /** 금액 불일치 등 안전장치 발동 사유 */
  safeguardReason?: string
  rawPayload?: Record<string, unknown>
}

export type KoreanPgWebhookValidationResult = {
  isValid: boolean
  expectedAmount?: number
  receivedAmount?: number
  currencyCode?: string
  paymentSessionId?: string
  orderId?: string
  cartId?: string
  groupDealParticipantId?: string
  paymentKey?: string
  paymentData?: Record<string, unknown>
  reason?: string
}
