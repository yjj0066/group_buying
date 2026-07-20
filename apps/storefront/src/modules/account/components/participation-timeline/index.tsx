"use client"

import { useDictionary } from "@i18n/provider"
import { Text } from "@modules/common/components/ui"
import type { GroupDealParticipantStage } from "types/group-deal"

type ParticipationTimelineProps = {
  stage: GroupDealParticipantStage
}

const STAGES: GroupDealParticipantStage[] = [
  "recruiting",
  "payment_complete",
  "purchasing",
  "opening",
  "shipping",
  "delivery_confirmed",
]

const ParticipationTimeline = ({ stage }: ParticipationTimelineProps) => {
  const t = useDictionary()
  const currentIndex = Math.max(0, STAGES.indexOf(stage))

  return (
    <ol className="flex flex-wrap items-center gap-2">
      {STAGES.map((item, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex

        return (
          <li key={item} className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                isCurrent
                  ? "bg-brand-pink/10 text-brand-pink"
                  : isCompleted
                    ? "bg-brand-purple/10 text-brand-purple"
                    : "bg-ui-bg-subtle text-ui-fg-muted"
              }`}
            >
              {t.account.groupBuying.stages[item]}
            </span>
            {index < STAGES.length - 1 && (
              <Text className="text-ui-fg-muted">→</Text>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default ParticipationTimeline
