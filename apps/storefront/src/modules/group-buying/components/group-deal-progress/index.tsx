"use client"

import { GroupDeal, getParticipationRate } from "types/group-deal"
import { Text } from "@modules/common/components/ui"
import { formatMessage, useDictionary } from "@i18n/provider"

type GroupDealProgressProps = {
  deal: GroupDeal
}

const GroupDealProgress = ({ deal }: GroupDealProgressProps) => {
  const t = useDictionary()

  const minParticipants = deal.min_participants || deal.target_quantity
  const currentParticipants = deal.current_participants ?? 0
  const progress = getParticipationRate(deal)

  return (
    <div className="flex flex-col gap-y-2 w-full">
      <div className="flex justify-between text-small-regular text-ui-fg-subtle">
        <Text as="span">
          {formatMessage(t.groupBuying.participants, {
            current: currentParticipants,
            target: minParticipants,
          })}
        </Text>
        <Text as="span">{progress}%</Text>
      </div>
      <div className="w-full h-2 bg-ui-bg-subtle rounded-full overflow-hidden">
        <div
          className="h-full bg-ui-fg-interactive rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default GroupDealProgress
