"use client"

import { useDictionary } from "@i18n/provider"
import { Text } from "@modules/common/components/ui"
import {
  getStageIndex,
  GroupDealParticipationStage,
  PARTICIPATION_STAGES,
} from "types/account-group-deals"

type ParticipationTimelineProps = {
  stage: GroupDealParticipationStage
}

const ParticipationTimeline = ({ stage }: ParticipationTimelineProps) => {
  const t = useDictionary()
  const activeIndex = getStageIndex(stage)

  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-0">
      {PARTICIPATION_STAGES.map((step, index) => {
        const isComplete = index < activeIndex
        const isActive = index === activeIndex

        return (
          <li
            key={step}
            className="relative flex flex-1 flex-col items-start sm:items-center"
          >
            <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isComplete
                    ? "bg-emerald-500 text-white"
                    : isActive
                      ? "bg-violet-600 text-white ring-4 ring-violet-100"
                      : "bg-ui-bg-subtle text-ui-fg-muted"
                }`}
              >
                {isComplete ? "✓" : index + 1}
              </span>
              <Text
                className={`text-xs font-medium sm:text-center ${
                  isActive
                    ? "text-ui-fg-base"
                    : isComplete
                      ? "text-emerald-700"
                      : "text-ui-fg-muted"
                }`}
              >
                {t.account.groupBuying.stages[step]}
              </Text>
            </div>
            {index < PARTICIPATION_STAGES.length - 1 && (
              <div
                className={`ml-4 mt-1 h-6 w-px sm:absolute sm:left-[calc(50%+1rem)] sm:top-4 sm:ml-0 sm:h-0.5 sm:w-[calc(100%-2rem)] ${
                  index < activeIndex ? "bg-emerald-400" : "bg-ui-border-base"
                }`}
                aria-hidden
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default ParticipationTimeline
