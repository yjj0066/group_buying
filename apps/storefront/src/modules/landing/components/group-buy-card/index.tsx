"use client"

import Image from "next/image"
import { useMemo } from "react"

import {
  getDiscountPercent,
  getHoursLeft,
  getParticipationRate,
  getSpotsLeft,
} from "@lib/util/landing-deals"
import { useMounted } from "@lib/hooks/use-mounted"
import { convertToLocale } from "@lib/util/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { formatMessage, useDictionary } from "@i18n/provider"
import type { LandingDealCard } from "types/landing-deal"
import { clsx } from "clsx"

type GroupBuyCardProps = {
  deal: LandingDealCard
  variant?: "grid" | "horizontal" | "compact"
  showRank?: boolean
}

const GroupBuyCard = ({
  deal,
  variant = "grid",
  showRank = false,
}: GroupBuyCardProps) => {
  const t = useDictionary()
  const mounted = useMounted()
  const progress = getParticipationRate(deal)
  const spotsLeft = getSpotsLeft(deal)
  const discount = getDiscountPercent(deal)

  const timeLabel = useMemo(() => {
    if (!mounted) {
      return "—"
    }

    const hoursLeft = getHoursLeft(deal.endsAt)

    return hoursLeft <= 24
      ? formatMessage(t.landing.endingInHours, { hours: hoursLeft })
      : formatMessage(t.landing.daysLeft, {
          days: Math.ceil(hoursLeft / 24),
        })
  }, [mounted, deal.endsAt, t.landing.endingInHours, t.landing.daysLeft])

  return (
    <LocalizedClientLink
      href={deal.href}
      className={clsx(
        "group relative flex overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        variant === "horizontal" && "min-w-[300px] max-w-[320px] shrink-0 flex-col",
        variant === "grid" && "flex-col",
        variant === "compact" && "flex-row gap-4 p-3"
      )}
    >
      {showRank && deal.rank && (
        <span className="absolute left-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-brand-pink text-sm font-bold text-white shadow-lg">
          {deal.rank}
        </span>
      )}

      {deal.isNew && (
        <span className="absolute right-4 top-4 z-10 rounded-full bg-brand-purple px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          {t.landing.newBadge}
        </span>
      )}

      <div
        className={clsx(
          "relative overflow-hidden bg-neutral-50",
          variant === "compact" ? "h-24 w-24 shrink-0 rounded-2xl" : "aspect-square w-full"
        )}
      >
        <Image
          src={deal.imageUrl}
          alt={deal.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width:768px) 100vw, 320px"
        />
        <span className="absolute bottom-3 left-3 rounded-full bg-black/80 px-2.5 py-1 text-[10px] font-semibold text-white">
          {deal.groupName}
        </span>
      </div>

      <div className={clsx("flex flex-1 flex-col", variant === "compact" ? "py-1" : "gap-3 p-5")}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-purple">
            {t.landing.groupBuyLabel}
          </p>
          <h3 className="mt-1 line-clamp-2 text-base font-bold text-neutral-900">
            {deal.title}
          </h3>
        </div>

        <div className="flex items-end gap-2">
          <span className="text-xl font-bold text-neutral-900">
            {convertToLocale({
              amount: deal.currentPrice,
              currency_code: deal.currencyCode,
            })}
          </span>
          <span className="text-sm text-neutral-400 line-through">
            {convertToLocale({
              amount: deal.originalPrice,
              currency_code: deal.currencyCode,
            })}
          </span>
          <span className="rounded-md bg-brand-pink/10 px-1.5 py-0.5 text-xs font-bold text-brand-pink">
            -{discount}%
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>
              {formatMessage(t.landing.participants, {
                current: deal.currentParticipants,
                target: deal.targetParticipants,
              })}
            </span>
            <span className="font-medium text-neutral-700">{timeLabel}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="landing-progress-bar h-full rounded-full bg-gradient-to-r from-brand-pink to-brand-purple"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {spotsLeft <= 30 && (
          <span className="inline-flex w-fit rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            {formatMessage(t.landing.spotsLeft, { count: spotsLeft })}
          </span>
        )}

        {variant !== "compact" && (
          <span className="mt-auto inline-flex w-full items-center justify-center rounded-2xl bg-neutral-900 py-3 text-sm font-semibold text-white transition-transform group-hover:scale-[1.02] active:scale-[0.98]">
            {t.landing.joinButton}
          </span>
        )}
      </div>
    </LocalizedClientLink>
  )
}

export default GroupBuyCard
