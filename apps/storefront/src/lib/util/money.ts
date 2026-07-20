type ConvertToLocaleArgs = {
  amount: number
  currency_code: string
  locale?: string
}

export const convertToLocale = ({
  amount,
  currency_code,
  locale = "ko-KR",
}: ConvertToLocaleArgs): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency_code,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString(locale)} ${currency_code}`
  }
}
