import { ReactNode } from "react"

import { cn } from "../cn"

type BbVirtualAccountCardProps = {
  bankName: string
  accountNumber: string
  holder: string
  amountLabel: string
  copyAccountLabel?: string
  onCopyAccount?: () => void
  footer?: ReactNode
  className?: string
}

export const BbVirtualAccountCard = ({
  bankName,
  accountNumber,
  holder,
  amountLabel,
  copyAccountLabel,
  onCopyAccount,
  footer,
  className,
}: BbVirtualAccountCardProps) => (
  <div
    className={cn(
      "rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-5 text-center",
      className
    )}
  >
    <p className="text-2xl font-black text-[#111827]">{amountLabel}</p>
    <p className="mt-4 text-xs text-[#6B7280]">{bankName}</p>
    <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
      <p className="font-mono text-lg font-black tracking-wide text-[#4338CA]">
        {accountNumber}
      </p>
      {onCopyAccount && copyAccountLabel ? (
        <button
          type="button"
          onClick={onCopyAccount}
          className="shrink-0 rounded-lg border border-[#6B46E5] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B46E5] transition-colors hover:bg-[#F5F3FF]"
        >
          {copyAccountLabel}
        </button>
      ) : null}
    </div>
    <p className="mt-1 text-xs text-[#9CA3AF]">{holder}</p>
    {footer}
  </div>
)

export default BbVirtualAccountCard
