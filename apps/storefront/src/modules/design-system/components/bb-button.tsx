"use client"

import { forwardRef, ButtonHTMLAttributes } from "react"

import { cn } from "../cn"
import type { BbButtonVariant } from "../tokens"

type BbButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BbButtonVariant
  size?: "sm" | "md" | "lg"
  fullWidth?: boolean
  isLoading?: boolean
}

const variantClasses: Record<BbButtonVariant, string> = {
  primary: "bb-btn-primary",
  cta: "bb-btn-primary h-12 px-6 text-base rounded-xl",
  secondary:
    "inline-flex items-center justify-center rounded-xl border border-[#E5E7EB] bg-white font-semibold text-[#4B5563] transition-colors hover:border-[#D1D5DB] hover:bg-[#F9FAFB]",
  ghost:
    "inline-flex items-center justify-center rounded-xl bg-transparent font-medium text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]",
  danger:
    "inline-flex items-center justify-center rounded-xl bg-rose-50 font-semibold text-rose-700 border border-rose-200 hover:bg-rose-100",
}

const sizeClasses = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
}

export const BbButton = forwardRef<HTMLButtonElement, BbButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth,
      isLoading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isPrimary = variant === "primary" || variant === "cta"

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          variantClasses[variant],
          !isPrimary && sizeClasses[size],
          isPrimary && variant !== "cta" && sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {isLoading ? "..." : children}
      </button>
    )
  }
)
BbButton.displayName = "BbButton"

export default BbButton
