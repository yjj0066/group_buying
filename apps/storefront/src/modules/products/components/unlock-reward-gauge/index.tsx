"use client"

import { calculateAchievementRate } from "@lib/util/idol-product"
import { useDictionary, formatMessage } from "@i18n/provider"
import { GiftSolid, LockClosedSolid } from "@medusajs/icons"
import { clx } from "@modules/common/components/ui"

type UnlockRewardGaugeProps = {
  current: number
  target: number
}

const UNLOCK_MILESTONES = [
  {
    threshold: 100,
    key: "productionConfirmed" as const,
    emoji: "✨",
  },
  {
    threshold: 200,
    key: "hologramSticker" as const,
    emoji: "🎁",
  },
  {
    threshold: 300,
    key: "unreleasedPocaSet" as const,
    emoji: "💎",
  },
] as const

const UnlockRewardGauge = ({ current, target }: UnlockRewardGaugeProps) => {
  const t = useDictionary()
  const achievementRate = calculateAchievementRate(current, target)
  const barWidth = Math.min(achievementRate, 300)

  return (
    <section className="w-full rounded-2xl border border-ui-border-base bg-gradient-to-br from-violet-50/80 via-rose-50/50 to-amber-50/80 p-4 small:p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ui-fg-base">
          {t.idol.unlockEvent}
        </h3>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-violet-600 shadow-sm">
          {formatMessage(t.idol.achievementRate, { rate: achievementRate })}
        </span>
      </div>

      <div className="relative mb-8 pt-2">
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/70 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400 transition-all duration-700 ease-out"
            style={{ width: `${(barWidth / 300) * 100}%` }}
          />
        </div>

        <div className="absolute inset-x-0 top-0 flex justify-between px-[2%]">
          {UNLOCK_MILESTONES.map((milestone) => {
            const isUnlocked = achievementRate >= milestone.threshold
            const position = (milestone.threshold / 300) * 100

            return (
              <div
                key={milestone.threshold}
                className="absolute -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${position}%`, top: "-6px" }}
              >
                <div
                  className={clx(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-500",
                    {
                      "border-amber-300 bg-amber-100 text-amber-600 shadow-lg shadow-amber-100 scale-110":
                        isUnlocked,
                      "border-ui-border-base bg-white text-ui-fg-muted": !isUnlocked,
                    }
                  )}
                >
                  {isUnlocked ? (
                    <GiftSolid className="h-4 w-4 animate-bounce" />
                  ) : (
                    <LockClosedSolid className="h-3.5 w-3.5" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <ul className="grid gap-2">
        {UNLOCK_MILESTONES.map((milestone) => {
          const isUnlocked = achievementRate >= milestone.threshold

          return (
            <li
              key={milestone.threshold}
              className={clx(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-500",
                {
                  "border-amber-200 bg-amber-50/90 text-amber-800 shadow-sm":
                    isUnlocked,
                  "border-ui-border-base bg-white/60 text-ui-fg-muted": !isUnlocked,
                }
              )}
            >
              <span className="text-base">{milestone.emoji}</span>
              <div className="flex-1">
                <p
                  className={clx("text-xs font-bold", {
                    "text-amber-700": isUnlocked,
                  })}
                >
                  {formatMessage(t.idol.milestoneAchieved, {
                    threshold: milestone.threshold,
                  })}
                </p>
                <p
                  className={clx("text-sm", {
                    "font-semibold text-amber-800": isUnlocked,
                  })}
                >
                  {t.idol.milestones[milestone.key]}
                </p>
              </div>
              {isUnlocked ? (
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  {t.idol.unlocked}
                </span>
              ) : (
                <LockClosedSolid className="h-4 w-4 shrink-0 opacity-40" />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default UnlockRewardGauge
