export type TossEasyPayMethod =
  | "naverpay"
  | "kakaopay"
  | "tosspay"
  | "payco"
  | "samsungpay"
  | "applepay"

export type TossPaymentsProviderOptions = {
  /** 토스페이먼츠 시크릿 키 (서버 API) */
  secretKey: string

  /** 토스페이먼츠 클라이언트 키 (결제위젯 SDK) */
  clientKey: string

  /** 웹훅 서명 검증용 시크릿 */
  webhookSecret?: string

  /** 테스트 모드 (스텁 응답 허용) */
  testMode?: boolean

  /**
   * 허용 국가 ISO-2 코드 (기본: 한국만)
   * Medusa 리전 설정과 함께 사용합니다.
   */
  supportedCountries?: string[]

  /**
   * 결제위젯에 노출할 간편결제 수단
   * 미지정 시 네이버·카카오·토스페이 기본 활성화
   */
  enabledEasyPayMethods?: TossEasyPayMethod[]
}

export type TossPaymentSessionData = {
  id: string
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

export type TossBillingAuthSession = {
  customerKey: string
  orderId: string
  amount: number
  currencyCode: string
  clientKey: string
}

export type TossBillingKeyResult = {
  billingKey: string
  customerKey: string
  orderId: string
}

export type TossBillingCaptureInput = {
  billingKey: string
  customerKey: string
  orderId: string
  amount: number
  currencyCode: string
  orderName?: string
  customerEmail?: string
}

export type TossWidgetSessionInput = {
  orderId: string
  amount: number
  currencyCode: string
  orderName?: string
  customerEmail?: string
  customerName?: string
  easyPayMethods?: TossEasyPayMethod[]
  flowMode?: "DEFAULT" | "BILLING"
}

export type TossWidgetSession = {
  orderId: string
  amount: number
  currencyCode: string
  clientKey: string
  widgetVariant: "payment-widget"
  flowMode: "DEFAULT" | "BILLING"
  easyPayMethods: TossEasyPayMethod[]
}

export type TossWebhookEvent = {
  eventType: string
  orderId?: string
  paymentKey?: string
  transactionId?: string
  amount?: number
  currencyCode?: string
  status?: string
  rawPayload?: Record<string, unknown>
}
