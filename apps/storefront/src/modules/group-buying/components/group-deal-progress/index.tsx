"use client"

import { GroupDeal } from "types/group-deal"
import { Text } from "@modules/common/components/ui"
import { formatMessage, useDictionary } from "@i18n/provider"

type GroupDealProgressProps = {
  deal: GroupDeal
}

const GroupDealProgress = ({ deal }: GroupDealProgressProps) => {
  const t = useDictionary()

  const progress = Math.min(
    100,
    Math.round((deal.current_quantity / deal.target_quantity) * 100)
  )

  return (
    <div className="flex flex-col gap-y-2 w-full">
      <div className="flex justify-between text-small-regular text-ui-fg-subtle">
        <Text as="span">
          {formatMessage(t.groupBuying.participants, {
            current: deal.current_quantity,
            target: deal.target_quantity,
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
