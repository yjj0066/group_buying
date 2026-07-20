import { HTMLAttributes, ReactNode } from "react"

import { cn } from "../cn"
import type { BbAlertVariant } from "../tokens"

type BbAlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: BbAlertVariant
  title?: string
}

const variantClasses: Record<BbAlertVariant, string> = {
  info: "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]",
  warn: "border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]",
  error: "border-rose-200 bg-rose-50 text-rose-800 font-semibold",
  success: "border-[#BBF7D0] bg-[#DCFCE7] text-[#166534]",
  highlight: "border-[#DDD6FE] bg-[#F5F3FF] text-[#4338CA] font-bold",
}

export const BbAlert = ({
  className,
  variant = "info",
  title,
  children,
  ...props
}: BbAlertProps) => (
  <div
    className={cn(
      "rounded-xl border px-4 py-3 text-sm leading-relaxed",
      variantClasses[variant],
      className
    )}
    {...props}
  >
    {title && <p className="mb-1 font-bold">{title}</p>}
    {children}
  </div>
)

type BbBannerProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

export const BbBanner = ({ className, children, ...props }: BbBannerProps) => (
  <div
    className={cn(
      "rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] px-4 py-3 text-center text-sm font-bold text-[#9CA3AF]",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

export default BbAlert
