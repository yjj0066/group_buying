import { cn } from "../cn"

type BbTimerBannerProps = {
  children: string
  className?: string
  urgent?: boolean
}

export const BbTimerBanner = ({
  children,
  className,
  urgent = true,
}: BbTimerBannerProps) => (
  <div
    className={cn(
      "rounded-xl border px-4 py-3 text-center text-sm font-bold whitespace-pre-line",
      urgent
        ? "border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]"
        : "border-[#E5E7EB] bg-[#F3F4F6] text-[#9CA3AF]",
      className
    )}
  >
    {children}
  </div>
)

export default BbTimerBanner
