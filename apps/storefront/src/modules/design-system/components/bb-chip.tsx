import { ButtonHTMLAttributes } from "react"

import { cn } from "../cn"

type BbChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  asSpan?: boolean
}

export const BbChip = ({
  className,
  active,
  asSpan,
  children,
  ...props
}: BbChipProps) => {
  const classes = cn(
    "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
    active
      ? "border-[#6B46E5]/30 bg-[#F5F3FF] text-[#6B46E5] font-semibold"
      : "border-[#E5E7EB] bg-[#F3F4F6] text-[#4B5563] hover:border-[#D1D5DB]",
    className
  )

  if (asSpan) {
    return <span className={classes}>{children}</span>
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  )
}

export default BbChip
