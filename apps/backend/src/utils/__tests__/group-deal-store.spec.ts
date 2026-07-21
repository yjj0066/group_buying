import {
  GroupDealDepositStatus,
  GroupDealStatus,
} from "../../types/group-buying"
import { isStoreVisibleGroupDeal } from "../group-deal-store"

describe("isStoreVisibleGroupDeal", () => {
  it("shows deals with deposited leader guarantee", () => {
    expect(
      isStoreVisibleGroupDeal({
        status: GroupDealStatus.OPEN,
        leader_customer_id: "cus_123",
        deposit_status: GroupDealDepositStatus.DEPOSITED,
        metadata: {},
      })
    ).toBe(true)
  })

  it("hides deals until leader deposit is secured", () => {
    expect(
      isStoreVisibleGroupDeal({
        status: GroupDealStatus.OPEN,
        leader_customer_id: "cus_123",
        deposit_status: GroupDealDepositStatus.PENDING,
        metadata: {},
      })
    ).toBe(false)
  })

  it("shows legacy admin-open deals without a leader", () => {
    expect(
      isStoreVisibleGroupDeal({
        status: GroupDealStatus.OPEN,
        leader_customer_id: null,
        deposit_status: GroupDealDepositStatus.PENDING,
        metadata: {},
      })
    ).toBe(true)
  })
})
