import {
  GroupDealDepositStatus,
  GroupDealParticipantStatus,
  GroupDealWaitlistStatus,
} from "../../types/group-buying"

describe("group-deal escrow types", () => {
  it("defines deposit lifecycle statuses", () => {
    expect(GroupDealDepositStatus.PENDING).toBe("pending")
    expect(GroupDealDepositStatus.DEPOSITED).toBe("deposited")
    expect(GroupDealDepositStatus.REFUNDED).toBe("refunded")
  })

  it("defines waitlist statuses", () => {
    expect(GroupDealWaitlistStatus.WAITING).toBe("waiting")
    expect(GroupDealWaitlistStatus.MATCHED).toBe("matched")
  })

  it("includes cancelled participant status for vacancy flow", () => {
    expect(GroupDealParticipantStatus.CANCELLED).toBe("cancelled")
  })
})
