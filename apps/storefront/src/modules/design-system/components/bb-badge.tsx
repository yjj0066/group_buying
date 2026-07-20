import { HTMLAttributes } from "react"

import { cn } from "../cn"
import type { BbBadgeVariant } from "../tokens"

type BbBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BbBadgeVariant
  size?: "sm" | "md"
}

const variantClasses: Record<BbBadgeVariant, string> = {
  default: "bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]",
  success: "bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]",
  warning: "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]",
  danger: "bg-rose-50 text-rose-700 border border-rose-100",
  trust: "bg-[#F5F3FF] text-[#6B46E5] border border-[#DDD6FE]",
  urgent: "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-bold",
  deposit: "bg-[#E1F5EE] text-[#0B6E53] border border-[#BBF7D0]",
  memberVacant: "bg-[#E1F5EE] text-[#0B6E53] border border-[#BBF7D0]",
  memberFull: "bg-[#F3F4F6] text-[#9CA3AF] line-through border border-[#E5E7EB]",
  memberHold: "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]",
  purple: "bg-[#F5F3FF] text-[#6B46E5] border border-[#DDD6FE]",
}

export const BbBadge = ({
  className,
  variant = "default",
  size = "sm",
  children,
  ...props
}: BbBadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full font-semibold",
      size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
      variantClasses[variant],
      className
    )}
    {...props}
  >
    {children}
  </span>
)

export default BbBadge
