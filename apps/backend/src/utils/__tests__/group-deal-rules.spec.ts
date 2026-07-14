import {
  calculateParticipationRate,
  countUniqueConfirmedParticipants,
  evaluateDealStatus,
  isDealJoinable,
} from "../utils/group-deal-rules"
import {
  GroupDealParticipantStatus,
  GroupDealStatus,
} from "../types/group-buying"

describe("group-deal-rules", () => {
  const baseDeal = {
    status: GroupDealStatus.OPEN,
    starts_at: new Date(Date.now() - 60_000).toISOString(),
    ends_at: new Date(Date.now() + 60_000).toISOString(),
    min_participants: 10,
    current_participants: 0,
    current_quantity: 0,
    max_quantity: 100,
  }

  it("calculates participation rate from confirmed customers", () => {
    expect(calculateParticipationRate(5, 10)).toBe(50)
    expect(calculateParticipationRate(12, 10)).toBe(100)
  })

  it("transitions open to minimum_reached when min participants met", () => {
    const nextStatus = evaluateDealStatus({
      ...baseDeal,
      current_participants: 10,
    })

    expect(nextStatus).toBe(GroupDealStatus.MINIMUM_REACHED)
  })

  it("transitions to closed when max quantity is sold out", () => {
    const nextStatus = evaluateDealStatus({
      ...baseDeal,
      status: GroupDealStatus.MINIMUM_REACHED,
      current_quantity: 100,
    })

    expect(nextStatus).toBe(GroupDealStatus.CLOSED)
  })

  it("counts unique confirmed participants by customer or email", () => {
    const count = countUniqueConfirmedParticipants([
      {
        status: GroupDealParticipantStatus.CONFIRMED,
        customer_id: "cus_1",
        email: "a@example.com",
        quantity: 2,
      },
      {
        status: GroupDealParticipantStatus.CONFIRMED,
        customer_id: "cus_1",
        email: "a@example.com",
        quantity: 1,
      },
      {
        status: GroupDealParticipantStatus.CONFIRMED,
        customer_id: null,
        email: "b@example.com",
        quantity: 1,
      },
      {
        status: GroupDealParticipantStatus.PENDING,
        customer_id: null,
        email: "c@example.com",
        quantity: 1,
      },
    ])

    expect(count).toBe(2)
  })

  it("allows join only for open/minimum_reached within deadline", () => {
    expect(isDealJoinable(baseDeal)).toBe(true)
    expect(
      isDealJoinable({
        ...baseDeal,
        status: GroupDealStatus.CLOSED,
      })
    ).toBe(false)
  })
})
