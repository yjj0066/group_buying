"use client"

import { memo } from "react"

import GroupDealCard from "@modules/group-buying/components/group-deal-card"
import type { GroupDeal } from "types/group-deal"

type GroupDealCardListProps = {
  deals: GroupDeal[]
  highlightMember?: string
  layout?: "stack" | "grid"
  className?: string
}

const GroupDealCardList = ({
  deals,
  highlightMember,
  layout = "stack",
  className,
}: GroupDealCardListProps) => {
  if (deals.length === 0) {
    return null
  }

  return (
    <div
      className={
        className ??
        (layout === "grid"
          ? "grid grid-cols-1 gap-3 medium:grid-cols-2"
          : "flex flex-col gap-3")
      }
    >
      {deals.map((deal) => (
        <GroupDealCard
          key={deal.id}
          deal={deal}
          highlightMember={highlightMember}
          className={layout === "grid" ? "p-4 small:p-4" : undefined}
        />
      ))}
    </div>
  )
}

export default memo(GroupDealCardList)
