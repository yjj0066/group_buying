import { DEFAULT_GROUP_BUYING_GOODS_TYPE } from "@lib/constants/group-buying-catalog"

export type LeaderCreateMemberSeat = {
  id: string
  label: string
  price: number
  quantity: number
}

export type LeaderCreateShippingMethod = {
  id: string
  name: string
  fee: string
}

export type LeaderCreateRefundAccount = {
  bankCode: string
  bankName: string
  accountNumber: string
  accountHolder: string
}

export type LeaderCreateDraft = {
  idolGroup: string
  goodsType: string
  title: string
  primarySeller: string
  productImageDataUrl?: string | null
  productImageFileName?: string | null
  recruitmentDeadline: string
  expectedShipDate: string
  expectedShippingFee: string
  memberSeats: LeaderCreateMemberSeat[]
  albumQuantity: string
  depositPeriodStartDate: string
  depositPeriodStartTime: string
  depositPeriodEndDate: string
  depositPeriodEndTime: string
  shippingMethods: LeaderCreateShippingMethod[]
  refundAccount: LeaderCreateRefundAccount
  depositPaymentExpiresAt?: string
  createdDealId?: string
}

let seatCounter = 0
let shippingMethodCounter = 0

export const createMemberSeat = (
  label: string,
  price: number,
  quantity: number
): LeaderCreateMemberSeat => {
  seatCounter += 1

  return {
    id: `seat-${seatCounter}`,
    label,
    price,
    quantity,
  }
}

export const createEmptyShippingMethod = (): LeaderCreateShippingMethod => {
  shippingMethodCounter += 1

  return {
    id: `shipping-${shippingMethodCounter}`,
    name: "",
    fee: "",
  }
}

export const createEmptyDraft = (): LeaderCreateDraft => ({
  idolGroup: "",
  goodsType: DEFAULT_GROUP_BUYING_GOODS_TYPE,
  title: "",
  primarySeller: "",
  productImageDataUrl: null,
  productImageFileName: null,
  recruitmentDeadline: "",
  expectedShipDate: "",
  expectedShippingFee: "",
  memberSeats: [createMemberSeat("", 0, 0)],
  albumQuantity: "",
  depositPeriodStartDate: "",
  depositPeriodStartTime: "",
  depositPeriodEndDate: "",
  depositPeriodEndTime: "",
  shippingMethods: [createEmptyShippingMethod()],
  refundAccount: {
    bankCode: "",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
  },
})

export const getTotalSeatCount = (seats: LeaderCreateMemberSeat[]) =>
  seats.reduce((sum, seat) => sum + seat.quantity, 0)

export const getTotalRecruitmentAmount = (seats: LeaderCreateMemberSeat[]) =>
  seats.reduce((sum, seat) => sum + seat.price * seat.quantity, 0)

export const hasLeaderCreateDraftContent = (draft: LeaderCreateDraft): boolean =>
  Boolean(
    draft.idolGroup.trim() ||
      draft.goodsType.trim() ||
      draft.title.trim() ||
      draft.memberSeats.some((seat) => seat.label.trim() || seat.price > 0)
  )
