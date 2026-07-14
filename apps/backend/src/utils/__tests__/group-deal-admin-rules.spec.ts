import { MedusaError } from "@medusajs/framework/utils"
import {
  assertDealCancellable,
  assertDealDeletable,
  assertDealUpdatable,
  assertStatusTransitionAllowed,
  validateDealSchedule,
} from "../group-deal-admin-rules"
import { GroupDealStatus } from "../../types/group-buying"

describe("group-deal-admin-rules", () => {
  const baseDeal = {
    status: GroupDealStatus.OPEN,
    current_participants: 5,
    starts_at: new Date("2026-07-01T00:00:00Z"),
    ends_at: new Date("2026-07-31T00:00:00Z"),
  }

  it("rejects updates for closed deals", () => {
    expect(() =>
      assertDealUpdatable({
        ...baseDeal,
        status: GroupDealStatus.CLOSED,
      })
    ).toThrow(MedusaError.Types.NOT_ALLOWED)
  })

  it("rejects deleting deals with participants", () => {
    expect(() =>
      assertDealDeletable({
        status: GroupDealStatus.DRAFT,
        current_participants: 2,
        starts_at: baseDeal.starts_at,
        ends_at: baseDeal.ends_at,
      })
    ).toThrow(MedusaError.Types.NOT_ALLOWED)
  })

  it("allows cancelling open deals", () => {
    expect(() => assertDealCancellable(baseDeal)).not.toThrow()
  })

  it("validates schedule ordering", () => {
    expect(() =>
      validateDealSchedule({
        starts_at: "2026-08-01T00:00:00Z",
        ends_at: "2026-07-01T00:00:00Z",
      })
    ).toThrow(MedusaError.Types.INVALID_DATA)
  })

  it("allows draft to open status transition", () => {
    expect(() =>
      assertStatusTransitionAllowed(
        GroupDealStatus.DRAFT,
        GroupDealStatus.OPEN
      )
    ).not.toThrow()
  })
})
