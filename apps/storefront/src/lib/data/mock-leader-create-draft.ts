import {
  createEmptyShippingMethod,
  createMemberSeat,
  type LeaderCreateDraft,
} from "@modules/group-buying/components/leader-create-wizard/types"

export const MOCK_LEADER_CREATE_DRAFT: LeaderCreateDraft = {
  idolGroup: "aespa",
  goodsType: "시즌그reetings",
  title: "aespa 시즌그reetings MD 공구",
  primarySeller: "위버스샵",
  recruitmentDeadline: "2026-08-31",
  expectedShipDate: "2026-09-30",
  expectedShippingFee: "28000",
  memberSeats: [
    createMemberSeat("카리나", 15000, 2),
    createMemberSeat("윈터", 19000, 3),
    createMemberSeat("닝닝", 20000, 3),
    createMemberSeat("지젤", 19000, 2),
  ],
  albumQuantity: "10",
  depositPeriodStartDate: "",
  depositPeriodStartTime: "",
  depositPeriodEndDate: "",
  depositPeriodEndTime: "",
  shippingMethods: [createEmptyShippingMethod()],
  refundAccount: {
    bankCode: "004",
    bankName: "국민은행",
    accountNumber: "123456789012",
    accountHolder: "홍길동",
  },
}
