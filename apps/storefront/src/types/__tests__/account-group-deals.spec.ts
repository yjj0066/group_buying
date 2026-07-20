import { resolveParticipationTab } from "types/account-group-deals"
import type { AccountParticipation } from "types/account-group-deals"

const baseParticipation = (
  partial: Partial<AccountParticipation>
): AccountParticipation => ({
  participant_id: "part-test",
  quantity: 1,
  status: "confirmed",
  stage: "payment_complete",
  member_label: "민지",
  tracking_number: null,
  carrier: null,
  payment_deadline: null,
  delivery_confirmed_at: null,
  group_deal: {
    id: "deal-test",
    title: "Test deal",
    status: "open",
    leader_stage: "recruiting",
    deposit_status: "deposited",
    deposit_amount: 10000,
    currency_code: "krw",
    current_participants: 1,
    target_quantity: 9,
    ends_at: null,
    purchase_receipt_status: "pending",
    created_at: new Date().toISOString(),
  },
  created_at: new Date().toISOString(),
  ...partial,
})

describe("resolveParticipationTab", () => {
  it("maps cancelled and refunded statuses to cancelled tab", () => {
    expect(
      resolveParticipationTab(baseParticipation({ status: "cancelled" }))
    ).toBe("cancelled")
    expect(
      resolveParticipationTab(baseParticipation({ status: "refunded" }))
    ).toBe("cancelled")
  })

  it("maps in-progress stages and deposit statuses to active tab", () => {
    expect(
      resolveParticipationTab(
        baseParticipation({ status: "pending_deposit", stage: "recruiting" })
      )
    ).toBe("active")
    expect(
      resolveParticipationTab(
        baseParticipation({ status: "deposit_confirmed", stage: "recruiting" })
      )
    ).toBe("active")
    expect(
      resolveParticipationTab(
        baseParticipation({ status: "confirmed", stage: "shipping" })
      )
    ).toBe("active")
  })

  it("maps completed delivery and purchase confirmation to completed tab", () => {
    expect(
      resolveParticipationTab(
        baseParticipation({
          stage: "delivery_confirmed",
          delivery_confirmed_at: new Date().toISOString(),
        })
      )
    ).toBe("completed")
    expect(
      resolveParticipationTab(
        baseParticipation({ status: "purchase_confirmed", stage: "shipping" })
      )
    ).toBe("completed")
    expect(
      resolveParticipationTab(baseParticipation({ status: "completed" }))
    ).toBe("completed")
  })
})
