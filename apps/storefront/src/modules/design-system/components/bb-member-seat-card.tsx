"use client"

import { ButtonHTMLAttributes } from "react"

import { BbBadge } from "./bb-badge"
import { cn } from "../cn"
import type { BbMemberSeatStatus } from "../tokens"

type BbMemberSeatCardProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  member: string
  priceLabel: string
  status: BbMemberSeatStatus
  statusLabel: string
  remaining?: number | null
}

const statusStyles: Record<BbMemberSeatStatus, string> = {
  vacant:
    "border-[#E5E7EB] bg-white hover:border-[#0B6E53]/30",
  selected:
    "border-[#FDE68A] bg-[#FEF3C7] ring-1 ring-[#FDE68A]/60",
  hold: "border-[#FDE68A] bg-[#FEF3C7] ring-1 ring-[#FDE68A]/60",
  full: "cursor-not-allowed border-[#E5E7EB] bg-[#F3F4F6] opacity-70",
}

const badgeVariant: Record<
  BbMemberSeatStatus,
  "memberVacant" | "memberHold" | "memberFull" | "purple"
> = {
  vacant: "memberVacant",
  selected: "memberHold",
  hold: "memberHold",
  full: "memberFull",
}

export const BbMemberSeatCard = ({
  member,
  priceLabel,
  status,
  statusLabel,
  remaining,
  className,
  disabled,
  ...props
}: BbMemberSeatCardProps) => (
  <button
    type="button"
    disabled={disabled || status === "full"}
    className={cn(
      "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200",
      statusStyles[status],
      status === "full" && "text-[#9CA3AF]",
      className
    )}
    {...props}
  >
    <span
      className={cn(
        "min-w-0 flex-1 text-sm font-bold",
        status === "full" ? "text-[#9CA3AF]" : "text-[#111827]"
      )}
    >
      {member}
    </span>
    <span
      className={cn(
        "shrink-0 text-sm font-bold",
        status === "full" ? "text-[#9CA3AF]" : "text-[#111827]"
      )}
    >
      {priceLabel}
    </span>
    <BbBadge variant={badgeVariant[status]} className="shrink-0">
      {statusLabel}
    </BbBadge>
    {remaining != null && status === "vacant" && (
      <span className="sr-only">{remaining}석 남음</span>
    )}
  </button>
)

export default BbMemberSeatCard