"use client"

import { useDictionary } from "@i18n/provider"
import { cn } from "@modules/design-system"
import {
  DEAL_TIMELINE_STAGES,
  getDealTimelineStageIndex,
  resolveDealTimelineStage,
  type GroupDeal,
} from "types/group-deal"

type DealTimelineProps = {
  deal: GroupDeal
  className?: string
}

const DealTimeline = ({ deal, className }: DealTimelineProps) => {
  const t = useDictionary()
  const currentIndex = getDealTimelineStageIndex(resolveDealTimelineStage(deal))
  const labels = t.groupBuying.dealTimelineStages

  return (
    <div
      className={cn(
        "rounded-xl border border-[#E5E7EB] bg-white p-4",
        className
      )}
    >
      <p className="text-sm font-bold text-[#111827]">진행 현황</p>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {DEAL_TIMELINE_STAGES.map((stage, index) => {
          const active = index === currentIndex
          const done = index < currentIndex

          return (
            <div key={stage} className="flex flex-col items-center gap-2">
              <span
                className={cn(
                  "h-1.5 w-full rounded-full",
                  active
                    ? "bg-[#6B46E5]"
                    : done
                      ? "bg-[#C4B5FD]"
                      : "bg-[#E5E7EB]"
                )}
              />
              <span
                className={cn(
                  "text-center text-[10px] font-semibold leading-tight",
                  active
                    ? "font-bold text-[#6B46E5]"
                    : done
                      ? "text-[#6B7280]"
                      : "text-[#9CA3AF]"
                )}
              >
                {labels[stage]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DealTimeline