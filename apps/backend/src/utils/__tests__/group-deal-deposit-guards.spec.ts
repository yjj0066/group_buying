import {
  assertDepositBeforeActivate,
  assertStatusTransitionAllowed,
} from "../group-deal-admin-rules"
import {
  assertDealJoinable,
  isDealDepositSecured,
  isDealJoinable,
} from "../group-deal-rules"
import { GroupDealDepositStatus, GroupDealStatus } from "../../types/group-buying"

describe("group-deal-admin-rules deposit guard", () => {
  it("blocks draft to open without deposited leader deposit", () => {
    expect(() =>
      assertStatusTransitionAllowed(
        GroupDealStatus.DRAFT,
        GroupDealStatus.OPEN,
        {
          status: GroupDealStatus.DRAFT,
          current_participants: 0,
          starts_at: new Date(),
          ends_at: new Date(),
          deposit_status: GroupDealDepositStatus.PENDING,
        }
      )
    ).toThrow("Leader deposit must be paid before activating")
  })

  it("allows draft to open when deposit is secured", () => {
    expect(() =>
      assertStatusTransitionAllowed(
        GroupDealStatus.DRAFT,
        GroupDealStatus.OPEN,
        {
          status: GroupDealStatus.DRAFT,
          current_participants: 0,
          starts_at: new Date(),
          ends_at: new Date(),
          deposit_status: GroupDealDepositStatus.DEPOSITED,
        }
      )
    ).not.toThrow()
  })

  it("assertDepositBeforeActivate only applies to open transition", () => {
    expect(() =>
      assertDepositBeforeActivate(
        {
          status: GroupDealStatus.DRAFT,
          current_participants: 0,
          starts_at: new Date(),
          ends_at: new Date(),
          deposit_status: GroupDealDepositStatus.PENDING,
        },
        GroupDealStatus.CANCELLED
      )
    ).not.toThrow()
  })
})

describe("group-deal-rules deposit join guard", () => {
  const baseDeal = {
    status: GroupDealStatus.OPEN,
    starts_at: new Date(Date.now() - 60_000),
    ends_at: new Date(Date.now() + 60_000),
    min_participants: 5,
    current_participants: 1,
    current_quantity: 1,
    max_quantity: 10,
  }

  it("rejects join when leader deposit is pending", () => {
    expect(
      isDealJoinable({
        ...baseDeal,
        deposit_status: GroupDealDepositStatus.PENDING,
      })
    ).toBe(false)

    expect(() =>
      assertDealJoinable(
        {
          ...baseDeal,
          deposit_status: GroupDealDepositStatus.PENDING,
        },
        1
      )
    ).toThrow("leader deposit is paid")
  })

  it("allows join when leader deposit is secured", () => {
    expect(
      isDealJoinable({
        ...baseDeal,
        deposit_status: GroupDealDepositStatus.DEPOSITED,
      })
    ).toBe(true)

    expect(isDealDepositSecured({
      ...baseDeal,
      deposit_status: GroupDealDepositStatus.DEPOSITED,
    })).toBe(true)
  })
})
