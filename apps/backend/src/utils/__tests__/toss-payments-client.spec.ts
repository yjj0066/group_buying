import {
  assertTossPaymentsOptions,
  createTossPaymentsClient,
} from "../modules/toss-payments/client"
import { resolveTossPaymentsOptionsFromEnv } from "./toss-payments-options"

describe("toss-payments client", () => {
  it("creates widget session metadata for checkout", async () => {
    const options = resolveTossPaymentsOptionsFromEnv()
    options.testMode = true

    assertTossPaymentsOptions(options)

    const client = createTossPaymentsClient(options)
    const session = await client.createWidgetSession({
      orderId: "order_123",
      amount: 15000,
      currencyCode: "krw",
      easyPayMethods: ["naverpay", "kakaopay", "tosspay"],
    })

    expect(session.widgetVariant).toBe("payment-widget")
    expect(session.flowMode).toBe("DEFAULT")
    expect(session.amount).toBe(15000)
  })

  it("creates billing auth session for group deal reservation", async () => {
    const options = resolveTossPaymentsOptionsFromEnv()
    options.testMode = true
    options.clientKey = "test_ck"

    const client = createTossPaymentsClient(options)
    const session = await client.createBillingAuthSession({
      customerKey: "customer_1",
      orderId: "order_billing_1",
      amount: 20000,
      currencyCode: "krw",
    })

    expect(session.clientKey).toBe("test_ck")
    expect(session.customerKey).toBe("customer_1")
  })

  it("rejects non-krw currency", async () => {
    const options = resolveTossPaymentsOptionsFromEnv()
    options.testMode = true

    const client = createTossPaymentsClient(options)

    await expect(
      client.createBillingAuthSession({
        customerKey: "customer_1",
        orderId: "order_1",
        amount: 20,
        currencyCode: "usd",
      })
    ).rejects.toThrow("only supports KRW")
  })
})
