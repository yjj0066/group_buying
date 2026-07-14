import {
  createTestWebhookSignature,
  verifyPortoneWebhookSignature,
  verifyTossWebhookSignature,
} from "../utils/korean-pg-webhook-signature"

describe("korean-pg-webhook-signature", () => {
  const secret = "whsec_test_secret"

  it("verifies toss webhook signatures", () => {
    const rawBody = JSON.stringify({
      eventType: "PAYMENT_STATUS_CHANGED",
      data: { orderId: "payses_123", totalAmount: 10000 },
    })

    const signature = createTestWebhookSignature(rawBody, secret)

    expect(
      verifyTossWebhookSignature({
        rawBody,
        signature,
        secret,
      })
    ).toBe(true)
  })

  it("rejects invalid toss signatures", () => {
    expect(
      verifyTossWebhookSignature({
        rawBody: "{}",
        signature: "invalid",
        secret,
      })
    ).toBe(false)
  })

  it("verifies portone webhook signatures", () => {
    const crypto = require("crypto")
    const expected = crypto
      .createHash("sha256")
      .update("imp_123" + secret + "paid")
      .digest("hex")

    expect(
      verifyPortoneWebhookSignature({
        impUid: "imp_123",
        status: "paid",
        signature: expected,
        secret,
      })
    ).toBe(true)
  })
})
