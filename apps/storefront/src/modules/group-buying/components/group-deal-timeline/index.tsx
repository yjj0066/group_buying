"use client"

import {
  DEAL_TIMELINE_STAGES,
  getDealTimelineStageIndex,
  GroupDeal,
  GroupDealTimelineStage,
  resolveDealTimelineStage,
} from "types/group-deal"
import { useDictionary } from "@i18n/provider"
import { CheckCircleSolid } from "@medusajs/icons"
import { clx } from "@modules/common/components/ui"

type GroupDealTimelineProps = {
  deal: GroupDeal
}

const GroupDealTimeline = ({ deal }: GroupDealTimelineProps) => {
  const t = useDictionary()
  const currentStage = resolveDealTimelineStage(deal)
  const currentIndex = getDealTimelineStageIndex(currentStage)

  const getStageLabel = (stageId: GroupDealTimelineStage) =>
    t.groupBuying.dealTimelineStages?.[stageId] ?? stageId

  return (
    <section
      className="bb-card p-5 small:p-6"
      aria-label={t.groupBuying.dealTimelineTitle}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-black tracking-tight text-neutral-900">
          {t.groupBuying.dealTimelineTitle}
        </h3>
        <span className="rounded-full bg-brand-pink/10 px-3 py-1 text-xs font-semibold text-brand-pink">
          {getStageLabel(currentStage)}
        </span>
      </div>

      <div className="relative px-1">
        <div className="absolute left-6 right-6 top-5 hidden h-0.5 rounded-full bg-neutral-100 small:block" />
        <div
          className="absolute left-6 top-5 hidden h-0.5 rounded-full bg-gradient-to-r from-brand-pink to-brand-purple transition-all duration-500 small:block"
          style={{
            width:
              currentIndex === 0
                ? "0%"
                : `calc(${(currentIndex / (DEAL_TIMELINE_STAGES.length - 1)) * 100}% - 3rem)`,
          }}
        />

        <ol className="relative grid grid-cols-4 gap-2 small:grid-cols-7">
          {DEAL_TIMELINE_STAGES.map((stage, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const isUpcoming = index > currentIndex

            return (
              <li
                key={stage}
                className="flex flex-col items-center text-center"
              >
                <div
                  className={clx(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                    {
                      "scale-110 border-brand-pink bg-brand-pink/10 text-brand-pink shadow-md shadow-brand-pink/20":
                        isCurrent,
                      "border-brand-purple/40 bg-brand-purple/10 text-brand-purple":
                        isCompleted,
                      "border-neutral-200 bg-white text-neutral-400": isUpcoming,
                    }
                  )}
                >
                  {isCompleted ? (
                    <CheckCircleSolid className="h-4 w-4" />
                  ) : (
                    <span className="text-[11px] font-bold">{index + 1}</span>
                  )}
                  {isCurrent && (
                    <span className="absolute -inset-1 animate-ping rounded-full bg-brand-pink/25" />
                  )}
                </div>
                <span
                  className={clx(
                    "mt-3 text-[10px] font-semibold leading-tight small:text-[11px]",
                    {
                      "text-brand-pink": isCurrent,
                      "text-brand-purple": isCompleted,
                      "text-neutral-400": isUpcoming,
                    }
                  )}
                >
                  {getStageLabel(stage)}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

export default GroupDealTimeline
