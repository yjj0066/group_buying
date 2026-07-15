"use client"

import { getParticipationRate, GroupDeal } from "types/group-deal"
import { useDictionary } from "@i18n/provider"
import { Text } from "@modules/common/components/ui"

type GroupDealProgressProps = {
  deal: GroupDeal
}

const GroupDealProgress = ({ deal }: GroupDealProgressProps) => {
  const t = useDictionary()
  const rate = getParticipationRate(deal)
  const target = deal.target_quantity || deal.min_participants || 1
  const current = deal.current_participants ?? deal.current_quantity ?? 0

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex items-center justify-between text-xs text-ui-fg-subtle">
        <Text>
          {t.groupBuying.participants
            .replace("{current}", String(current))
            .replace("{target}", String(target))}
        </Text>
        <Text>{rate}%</Text>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ui-bg-subtle">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-pink to-brand-purple transition-all duration-500"
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  )
}

export default GroupDealProgress
