export const biasColors = {
  ink: "#111827",
  mute: "#6B7280",
  line: "#E5E7EB",
  surface: "#F9FAFB",
  surfaceAlt: "#F3F4F6",
  pink: "#6B46E5",
  purple: "#6B46E5",
  purpleDeep: "#6B46E5",
  purpleTint: "#F5F3FF",
  pinkTint: "#F5F3FF",
  success: "#166534",
  successBg: "#DCFCE7",
  successSoft: "#E1F5EE",
  warning: "#92400E",
  warningBg: "#FEF3C7",
  danger: "#C42A57",
  dangerBg: "#FFF0F4",
  info: "#1D4ED8",
  infoBg: "#EFF6FF",
  trust: "#432A86",
} as const

export const biasGradients = {
  primary: "#6B46E5",
  primaryHover: "#5a3bd4",
  surface: "#F9FAFB",
  card: "#FFFFFF",
  trust: "#F5F3FF",
} as const

export const biasRadii = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  full: "9999px",
} as const

export const biasShadows = {
  card: "0 1px 3px rgba(0, 0, 0, 0.05)",
  cardHover: "0 2px 8px rgba(0, 0, 0, 0.08)",
  button: "0 2px 8px rgba(107, 70, 229, 0.25)",
  soft: "0 1px 3px rgba(0, 0, 0, 0.05)",
} as const

export type BbBadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "trust"
  | "urgent"
  | "deposit"
  | "memberVacant"
  | "memberFull"
  | "memberHold"
  | "purple"

export type BbAlertVariant = "info" | "warn" | "error" | "success" | "highlight"

export type BbButtonVariant = "primary" | "secondary" | "ghost" | "cta" | "danger"

export type BbMemberSeatStatus = "vacant" | "hold" | "full" | "selected"
