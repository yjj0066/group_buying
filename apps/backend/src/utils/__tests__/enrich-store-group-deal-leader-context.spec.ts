import { GroupDealStatus } from "../../types/group-buying"
import {
  convertLeaderTrustScoreToStorefront,
  resolveStoreGroupDealLeaderContext,
} from "../enrich-store-group-deal-leader-context"

describe("convertLeaderTrustScoreToStorefront", () => {
  it("maps the 1-5 backend scale to a 0-100 storefront score", () => {
    expect(convertLeaderTrustScoreToStorefront(5)).toBe(100)
    expect(convertLeaderTrustScoreToStorefront(4)).toBe(80)
    expect(convertLeaderTrustScoreToStorefront(3)).toBe(60)
    expect(convertLeaderTrustScoreToStorefront(1)).toBe(20)
  })
})

describe("resolveStoreGroupDealLeaderContext", () => {
  const leaderCustomerId = "cus_leader_1"

  it("marks repeat leaders as not first-time and includes settled deal stats", () => {
    const hostedDeals = [
      {
        id: "deal_1",
        leader_customer_id: leaderCustomerId,
        status: GroupDealStatus.SETTLED,
        created_at: "2026-01-01T00:00:00.000Z",
        metadata: {
          leader_reviews: [{ rating: 5, participant_id: "p1" }],
        },
      },
      {
        id: "deal_2",
        leader_customer_id: leaderCustomerId,
        status: GroupDealStatus.OPEN,
        created_at: "2026-02-01T00:00:00.000Z",
        metadata: {},
      },
    ]

    const context = resolveStoreGroupDealLeaderContext(
      {
        id: "deal_2",
        leader_customer_id: leaderCustomerId,
      },
      hostedDeals
    )

    expect(context.is_first_time_leader).toBe(false)
    expect(context.leader_role_number).toBe(2)
    expect(context.leader_completed_deals).toBe(1)
    expect(context.leader_trust_score).toBeGreaterThan(0)
  })

  it("marks leaders with a single non-draft deal as first-time", () => {
    const hostedDeals = [
      {
        id: "deal_1",
        leader_customer_id: leaderCustomerId,
        status: GroupDealStatus.OPEN,
        created_at: "2026-01-01T00:00:00.000Z",
        metadata: {},
      },
    ]

    const context = resolveStoreGroupDealLeaderContext(
      {
        id: "deal_1",
        leader_customer_id: leaderCustomerId,
      },
      hostedDeals
    )

    expect(context.is_first_time_leader).toBe(true)
    expect(context.leader_role_number).toBe(1)
    expect(context.leader_completed_deals).toBe(0)
    expect(context.leader_trust_score).toBe(
      convertLeaderTrustScoreToStorefront(3.2)
    )
  })
})
