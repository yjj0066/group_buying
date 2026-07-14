declare module "@tosspayments/payment-widget-sdk" {
  export type PaymentWidgetInstance = {
    renderPaymentMethods: (
      selector: string,
      amount: { value: number; currency?: string },
      options?: Record<string, unknown>
    ) => Promise<unknown>
    renderAgreement: (
      selector: string,
      options?: Record<string, unknown>
    ) => Promise<unknown>
    requestPayment: (params: Record<string, unknown>) => Promise<void>
    requestBillingAuth: (params: Record<string, unknown>) => Promise<void>
  }

  export function loadPaymentWidget(
    clientKey: string,
    customerKey: string
  ): Promise<PaymentWidgetInstance>
}
