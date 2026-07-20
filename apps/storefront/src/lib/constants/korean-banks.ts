export type KoreanBankOption = {
  code: string
  name: string
}

export const KOREAN_BANK_OPTIONS: KoreanBankOption[] = [
  { code: "088", name: "신한은행" },
  { code: "004", name: "KB국민은행" },
  { code: "020", name: "우리은행" },
  { code: "081", name: "하나은행" },
  { code: "090", name: "카카오뱅크" },
  { code: "092", name: "토스뱅크" },
]

export const resolveKoreanBankName = (code: string): string =>
  KOREAN_BANK_OPTIONS.find((bank) => bank.code === code)?.name ?? ""
