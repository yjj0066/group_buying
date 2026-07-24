import { GroupDealOptionType, GroupDealStatus } from "../../types/group-buying"
import { serializeSearchIndexGroupDealSnapshot } from "../group-deal-search-index"

describe("group-deal-search-index serializer", () => {
  const baseDeal = {
    id: "deal_01",
    title: "IVE 1st EP Group Buy",
    product_id: "prod_01",
    status: GroupDealStatus.OPEN,
    deal_price: 18000,
    currency_code: "krw",
    current_participants: 3,
    target_quantity: 10,
    ends_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-07-18T09:00:00.000Z",
    deposit_status: "deposited",
    purchase_receipt_status: "pending",
    leader_customer_id: "cus_leader",
    metadata: {
      idol_group: "IVE",
      urgent_fill: true,
      image_url: "https://cdn.example.com/group-buying/deal-images/cover.jpg",
    },
  }

  const memberOptions = [
    {
      id: "opt_yujin",
      option_type: GroupDealOptionType.MEMBER,
      option_key: "yujin",
      label: "Yujin",
      max_quantity: 2,
      current_quantity: 2,
    },
    {
      id: "opt_wonyoung",
      option_type: GroupDealOptionType.MEMBER,
      option_key: "wonyoung",
      label: "Wonyoung",
      max_quantity: 3,
      current_quantity: 1,
    },
    {
      id: "opt_version",
      option_type: GroupDealOptionType.VERSION,
      option_key: "ver_a",
      label: "Version A",
      max_quantity: 5,
      current_quantity: 0,
    },
  ]

  it("maps search-index snapshot fields from deal and member options", () => {
    const snapshot = serializeSearchIndexGroupDealSnapshot(
      baseDeal,
      memberOptions,
      {
        trustBadge: "gold",
        hostedDeals: [
          {
            id: "deal_01",
            status: GroupDealStatus.OPEN,
            created_at: "2026-07-01T00:00:00.000Z",
          },
        ],
      }
    )

    expect(snapshot.id).toBe("deal_01")
    expect(snapshot.idol_group).toBe("IVE")
    expect(snapshot.image_url).toBe(
      "https://cdn.example.com/group-buying/deal-images/cover.jpg"
    )
    expect(snapshot.urgent_flag).toBe(true)
    expect(snapshot.deposit_status).toBe("deposited")
    expect(snapshot.receipt_status).toBe("pending")
    expect(snapshot.stage).toBe("recruiting")
    expect(snapshot.trust_badge).toBe("gold")
    expect(snapshot.member_options).toEqual([
      {
        key: "yujin",
        label: "Yujin",
        max_quantity: 2,
        current_quantity: 2,
        remaining: 0,
      },
      {
        key: "wonyoung",
        label: "Wonyoung",
        max_quantity: 3,
        current_quantity: 1,
        remaining: 2,
      },
    ])
    expect(snapshot.vacant_member_list).toEqual(["Wonyoung"])
    expect(snapshot.leader_summary).toEqual({
      leader_role_number: 1,
      is_first_time_leader: true,
      trust_badge_label: "gold",
    })
  })

  it("defaults leader summary when leader context is omitted", () => {
    const snapshot = serializeSearchIndexGroupDealSnapshot(baseDeal, [])

    expect(snapshot.trust_badge).toBeNull()
    expect(snapshot.leader_summary).toEqual({
      leader_role_number: 1,
      is_first_time_leader: true,
      trust_badge_label: null,
    })
    expect(snapshot.member_options).toEqual([])
    expect(snapshot.vacant_member_list).toEqual([])
  })
})
