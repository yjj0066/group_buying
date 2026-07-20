type OptionRecord = {
  id: string
  option_key?: string | null
  label?: string | null
  option_type?: string | null
  deal_price?: number | string | null
  max_quantity?: number | string | null
  current_quantity?: number | string | null
  is_active?: boolean | null
}

export type VacancyRisk = "low" | "medium" | "high"

export type OptionPriceRecommendation = {
  option_id: string
  option_key: string
  label: string
  current_price: number
  recommended_price: number
  fill_rate: number
  vacancy_risk: VacancyRisk
  reason: string
}

const roundDownToHundred = (amount: number) => Math.floor(amount / 100) * 100

const resolveFillRate = (option: OptionRecord) => {
  const capacity = Number(option.max_quantity ?? 0)

  if (capacity <= 0) {
    return 1
  }

  const current = Number(option.current_quantity ?? 0)

  return Math.min(1, Math.max(0, current / capacity))
}

const resolveVacancyRisk = (fillRate: number): VacancyRisk => {
  if (fillRate < 0.4) {
    return "high"
  }

  if (fillRate < 0.7) {
    return "medium"
  }

  return "low"
}

const resolveDiscountRate = (risk: VacancyRisk) => {
  if (risk === "high") {
    return 0.1
  }

  if (risk === "medium") {
    return 0.05
  }

  return 0
}

const buildReason = (risk: VacancyRisk, fillRate: number) => {
  const percent = Math.round(fillRate * 100)

  if (risk === "high") {
    return `채움률 ${percent}% — 공석 위험이 높아 10% 인하를 권장합니다.`
  }

  if (risk === "medium") {
    return `채움률 ${percent}% — 공석 완화를 위해 5% 인하를 검토해 보세요.`
  }

  return `채움률 ${percent}% — 현재 가격을 유지해도 됩니다.`
}

export const buildOptionPriceRecommendations = (input: {
  options: OptionRecord[]
  dealPrice: number
}): OptionPriceRecommendation[] => {
  const memberOptions = input.options.filter(
    (option) =>
      option.is_active !== false &&
      String(option.option_type ?? "member") === "member"
  )

  return memberOptions.map((option) => {
    const currentPrice =
      option.deal_price != null
        ? Number(option.deal_price)
        : Number(input.dealPrice)
    const fillRate = resolveFillRate(option)
    const vacancyRisk = resolveVacancyRisk(fillRate)
    const discountRate = resolveDiscountRate(vacancyRisk)
    const rawRecommended = currentPrice * (1 - discountRate)
    const minimumPrice = roundDownToHundred(currentPrice * 0.7)
    let recommendedPrice = roundDownToHundred(rawRecommended)

    if (recommendedPrice >= currentPrice) {
      recommendedPrice = currentPrice
    }

    if (recommendedPrice < minimumPrice) {
      recommendedPrice = minimumPrice
    }

    return {
      option_id: String(option.id),
      option_key: String(option.option_key ?? option.id),
      label: String(option.label ?? option.option_key ?? "Member"),
      current_price: currentPrice,
      recommended_price: recommendedPrice,
      fill_rate: fillRate,
      vacancy_risk: vacancyRisk,
      reason: buildReason(vacancyRisk, fillRate),
    }
  })
}

export const assertPriceDecreaseOnly = (input: {
  currentPrice: number
  nextPrice: number
}) => {
  if (input.nextPrice > input.currentPrice) {
    throw new Error("Price increases are not allowed while recruiting")
  }
}
