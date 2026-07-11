"use client"

import { calculateAchievementRate } from "@lib/util/idol-product"
import { useDictionary, formatMessage } from "@i18n/provider"
import { Text } from "@modules/common/components/ui"

type ParticipationGaugeProps = {
  current: number
  target: number
}

const ParticipationGauge = ({ current, target }: ParticipationGaugeProps) => {
  const t = useDictionary()
  const rate = calculateAchievementRate(current, target)
  const displayRate = Math.min(rate, 999)

  return (
    <section className="w-full rounded-2xl border border-ui-border-base bg-white p-4 small:p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <Text className="text-sm font-semibold text-ui-fg-base">
          {t.idol.participationRate}
        </Text>
        <Text className="text-sm font-bold text-fuchsia-600">{displayRate}%</Text>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-ui-bg-subtle">
        <div
          className="h-full rounded-full bg-gradient-to-r from-rose-400 via-fuchsia-500 to-violet-500 transition-all duration-500"
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <Text className="mt-2 text-xs text-ui-fg-subtle">
        {formatMessage(t.idol.participationProgress, {
          current: current.toLocaleString(),
          target: target.toLocaleString(),
        })}
      </Text>
    </section>
  )
}

export default ParticipationGauge
