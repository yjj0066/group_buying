import {
  serializeStoreGroupDeal,
  serializeStoreGroupDealParticipant,
} from "../group-deal-store"

describe("group-deal-store serializer", () => {
  it("serializes group deal numbers and dates for the storefront", () => {
    const deal = serializeStoreGroupDeal({
      id: "gdeal_1",
      title: "Test Deal",
      description: null,
      product_id: "prod_1",
      variant_id: "variant_1",
      min_participants: 10,
      current_participants: 3,
      target_quantity: 100,
      current_quantity: 25,
      max_quantity: 200,
      original_price: "15000",
      deal_price: "9900",
      currency_code: "KRW",
      status: "open",
      starts_at: "2026-07-01T00:00:00.000Z",
      ends_at: "2026-08-01T00:00:00.000Z",
      metadata: null,
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-02T00:00:00.000Z",
    })

    expect(deal.original_price).toBe(15000)
    expect(deal.deal_price).toBe(9900)
    expect(deal.currency_code).toBe("krw")
    expect(deal.status).toBe("open")
  })

  it("strips sensitive participant fields", () => {
    const participant = serializeStoreGroupDealParticipant({
      id: "gpart_1",
      customer_id: "cus_1",
      email: "test@example.com",
      quantity: 2,
      status: "reserved",
      cart_id: "cart_1",
      order_id: "order_1",
      billing_key_encrypted: "secret",
      stripe_payment_method_id_encrypted: "secret",
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
    })

    expect(participant).not.toHaveProperty("billing_key_encrypted")
    expect(participant).not.toHaveProperty("stripe_payment_method_id_encrypted")
    expect(participant.status).toBe("reserved")
  })
})
