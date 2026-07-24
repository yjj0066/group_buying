export const GROUP_BUYING_PLATFORM_FEE = 500
export const GROUP_BUYING_SHIPPING_FEE = 3000
export const SEAT_HOLD_MINUTES = 5
export const GROUP_BUYING_LEADER_DEPOSIT_AMOUNT = 100_000
export const LEADER_DEPOSIT_DEADLINE_MINUTES = 60

const LEADER_DEPOSIT_RATE = 0.1
const LEADER_DEPOSIT_MIN = 30_000
const LEADER_DEPOSIT_MAX = 300_000

export const calculateLeaderDepositAmount = (input: {
  deal_price: number
  target_quantity: number
}): number => {
  const totalRecruitment = input.deal_price * input.target_quantity
  const raw = Math.round(totalRecruitment * LEADER_DEPOSIT_RATE)

  return Math.min(
    LEADER_DEPOSIT_MAX,
    Math.max(LEADER_DEPOSIT_MIN, raw)
  )
}

export const calculateDealApplicationTotal = (
  unitPrice: number,
  quantity: number
) => {
  const subtotal = unitPrice * quantity

  return {
    subtotal,
    platformFee: GROUP_BUYING_PLATFORM_FEE,
    shippingFee: GROUP_BUYING_SHIPPING_FEE,
    total: subtotal + GROUP_BUYING_PLATFORM_FEE + GROUP_BUYING_SHIPPING_FEE,
  }
}
