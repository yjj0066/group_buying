export const maskAccountHolderDisplay = (name: string): string => {
  const trimmed = name.trim()

  if (trimmed.length <= 1) {
    return trimmed
  }

  if (trimmed.length === 2) {
    return `${trimmed[0]}*`
  }

  return `${trimmed[0]}${"*".repeat(trimmed.length - 2)}${trimmed[trimmed.length - 1]}`
}

export const formatAccountNumberDisplay = (masked: string): string => {
  const digits = masked.replace(/\D/g, "")

  if (digits.length >= 4) {
    return `***${digits.slice(-4)}`
  }

  return masked
}

export const formatRegisteredDateDisplay = (value?: string | null): string => {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}.${month}.${day}`
}
