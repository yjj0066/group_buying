import { ReactNode } from "react"

import { cn } from "../cn"

type BbSectionHeaderProps = {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export const BbSectionHeader = ({
  title,
  subtitle,
  action,
  className,
}: BbSectionHeaderProps) => (
  <div
    className={cn(
      "mb-4 flex flex-wrap items-end justify-between gap-3",
      className
    )}
  >
    <div>
      <h2 className="text-lg font-bold tracking-tight text-[#111827]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm text-[#6B7280]">{subtitle}</p>
      )}
    </div>
    {action}
  </div>
)

export default BbSectionHeader
