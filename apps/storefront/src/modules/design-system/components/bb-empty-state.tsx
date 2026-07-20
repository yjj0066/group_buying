import { ReactNode } from "react"

import { BbButton } from "./bb-button"
import { cn } from "../cn"

type BbEmptyStateProps = {
  message: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
  children?: ReactNode
}

export const BbEmptyState = ({
  message,
  description,
  actionLabel,
  onAction,
  className,
  children,
}: BbEmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E7EB] bg-white px-6 py-16 text-center",
      className
    )}
  >
    <p className="text-base font-bold text-[#4B5563]">{message}</p>
    {description && (
      <p className="mt-2 text-sm text-[#9CA3AF]">{description}</p>
    )}
    {actionLabel && onAction && (
      <BbButton className="mt-6" onClick={onAction}>
        {actionLabel}
      </BbButton>
    )}
    {children}
  </div>
)

export default BbEmptyState
