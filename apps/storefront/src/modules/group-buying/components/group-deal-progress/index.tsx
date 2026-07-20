"use client"

import { useDictionary } from "@i18n/provider"
import type { GroupDeal } from "types/group-deal"
import { getDealFillProgress } from "types/group-deal"

type GroupDealProgressProps = {
  deal: GroupDeal
}

const GroupDealProgress = ({ deal }: GroupDealProgressProps) => {
  const t = useDictionary()
  const { filled, total, percent } = getDealFillProgress(deal)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-[var(--bb-mute)]">
        <span>
          {t.groupBuying.targetAndCurrent
            .replace("{target}", String(total))
            .replace("{current}", String(filled))}
        </span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
        <div
          className="h-full rounded-full bg-[#6B46E5] transition-all duration-500"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  )
}

export default GroupDealProgress
