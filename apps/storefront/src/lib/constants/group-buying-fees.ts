export const GROUP_BUYING_PLATFORM_FEE = 500
export const GROUP_BUYING_SHIPPING_FEE = 3000
export const SEAT_HOLD_MINUTES = 5
export const GROUP_BUYING_LEADER_DEPOSIT_AMOUNT = 100_000
export const LEADER_DEPOSIT_DEADLINE_MINUTES = 60

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
