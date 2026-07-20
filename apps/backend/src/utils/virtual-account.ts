/**
 * v3 P0: 플랫폼 전용 가상계좌 발급 (CHKO-01).
 * 실제 PG/은행 연동 전 개발·데모용 결정적 계좌번호 생성.
 */

export type VirtualAccountInfo = {
  bank_code: string
  bank_name: string
  account_number: string
  account_holder: string
  amount: number
  currency_code: string
  expires_at: string
}

const PLATFORM_BANKS = [
  { code: "088", name: "신한은행" },
  { code: "004", name: "KB국민은행" },
  { code: "020", name: "우리은행" },
] as const

const hashSeed = (seed: string): number => {
  let hash = 0

  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }

  return hash
}

export const generateVirtualAccount = (input: {
  reference_id: string
  amount: number
  currency_code?: string
  hold_minutes?: number
}): VirtualAccountInfo => {
  const hash = hashSeed(input.reference_id)
  const bank = PLATFORM_BANKS[hash % PLATFORM_BANKS.length]
  const accountSuffix = String(1000000000 + (hash % 9000000000)).slice(-10)
  const holdMinutes = input.hold_minutes ?? 5
  const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000)

  return {
    bank_code: bank.code,
    bank_name: bank.name,
    account_number: `562${accountSuffix}`,
    account_holder: "(주)아이돌공구",
    amount: input.amount,
    currency_code: (input.currency_code ?? "krw").toLowerCase(),
    expires_at: expiresAt.toISOString(),
  }
}

export const generateLeaderDepositVirtualAccount = (input: {
  group_deal_id: string
  deposit_amount: number
  currency_code?: string
}): VirtualAccountInfo => {
  return generateVirtualAccount({
    reference_id: `leader-deposit:${input.group_deal_id}`,
    amount: input.deposit_amount,
    currency_code: input.currency_code,
    hold_minutes: 60 * 24,
  })
}
