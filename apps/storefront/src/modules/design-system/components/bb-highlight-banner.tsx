import { ReactNode } from "react"

import { cn } from "../cn"

type BbHighlightBannerProps = {
  children: ReactNode
  className?: string
}

export const BbHighlightBanner = ({
  children,
  className,
}: BbHighlightBannerProps) => (
  <div
    className={cn(
      "rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] px-4 py-3 text-sm font-bold text-[#4338CA]",
      className
    )}
  >
    {children}
  </div>
)

export default BbHighlightBanner
