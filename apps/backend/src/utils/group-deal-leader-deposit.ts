const DEPOSIT_RATE = 0.1
const DEPOSIT_MIN = 30_000
const DEPOSIT_MAX = 300_000

export const calculateLeaderDepositAmount = (input: {
  deal_price: number
  target_quantity: number
}): number => {
  const totalRecruitment = input.deal_price * input.target_quantity
  const raw = Math.round(totalRecruitment * DEPOSIT_RATE)

  return Math.min(DEPOSIT_MAX, Math.max(DEPOSIT_MIN, raw))
}
