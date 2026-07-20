export type ShippingCourierOption = {
  value: string
  label: string
}

export const SHIPPING_COURIER_OPTIONS: ShippingCourierOption[] = [
  { value: "CJ대한통운", label: "CJ대한통운" },
  { value: "한진택배", label: "한진택배" },
  { value: "롯데택배", label: "롯데택배" },
  { value: "우체국택배", label: "우체국택배" },
  { value: "로젠택배", label: "로젠택배" },
  { value: "경동택배", label: "경동택배" },
  { value: "쿠팡로켓배송", label: "쿠팡로켓배송" },
  { value: "기타", label: "기타" },
]

export const SHIPPING_COURIER_VALUES = SHIPPING_COURIER_OPTIONS.map(
  (option) => option.value
)

export const normalizeShippingCourier = (value: string): string | null => {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const exact = SHIPPING_COURIER_VALUES.find(
    (courier) => courier.toLowerCase() === trimmed.toLowerCase()
  )

  if (exact) {
    return exact
  }

  const normalized = trimmed.toLowerCase()

  if (normalized.includes("cj") || normalized.includes("대한통운")) {
    return "CJ대한통운"
  }

  if (normalized.includes("hanjin") || normalized.includes("한진")) {
    return "한진택배"
  }

  if (normalized.includes("lotte") || normalized.includes("롯데")) {
    return "롯데택배"
  }

  if (normalized.includes("우체") || normalized.includes("epost")) {
    return "우체국택배"
  }

  if (normalized.includes("로젠")) {
    return "로젠택배"
  }

  if (normalized.includes("경동")) {
    return "경동택배"
  }

  if (normalized.includes("쿠팡") || normalized.includes("로켓")) {
    return "쿠팡로켓배송"
  }

  return trimmed
}
