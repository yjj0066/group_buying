import {
  canChangeParticipationShippingAddress,
  resolveParticipationProgressStage,
  shouldShowParticipationTracking,
} from "@lib/util/participation-progress-stage"
import type { AccountParticipation } from "types/account-group-deals"

const baseParticipation = (
  partial: Partial<AccountParticipation>
): AccountParticipation => ({
  participant_id: "part-test",
  quantity: 1,
  status: "confirmed",
  stage: "payment_complete",
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
    deposit_amount: 1000,
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

describe("participation progress stage", () => {
  it("maps backend stages to MYJN progress stages", () => {
    expect(
      resolveParticipationProgressStage(
        baseParticipation({ stage: "recruiting", status: "pending_deposit" })
      )
    ).toBe("deposit_confirming")

    expect(
      resolveParticipationProgressStage(
        baseParticipation({ stage: "payment_complete" })
      )
    ).toBe("order_complete")

    expect(
      resolveParticipationProgressStage(
        baseParticipation({ stage: "opening" })
      )
    ).toBe("shipping_prep")

    expect(
      resolveParticipationProgressStage(
        baseParticipation({
          stage: "shipping",
          tracking_number: "123",
        })
      )
    ).toBe("shipping_started")

    expect(
      resolveParticipationProgressStage(
        baseParticipation({
          stage: "delivery_confirmed",
          delivery_confirmed_at: new Date().toISOString(),
        })
      )
    ).toBe("delivery_complete")
  })

  it("allows address changes only before shipping prep", () => {
    expect(canChangeParticipationShippingAddress("deposit_confirming")).toBe(
      true
    )
    expect(canChangeParticipationShippingAddress("order_complete")).toBe(true)
    expect(canChangeParticipationShippingAddress("shipping_prep")).toBe(false)
  })

  it("shows tracking from shipping started onward", () => {
    expect(
      shouldShowParticipationTracking("shipping_started", "123456")
    ).toBe(true)
    expect(shouldShowParticipationTracking("shipping_prep", "123456")).toBe(
      false
    )
  })
})
