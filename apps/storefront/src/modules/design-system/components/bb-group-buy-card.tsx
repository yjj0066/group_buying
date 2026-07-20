"use client"

import Image from "next/image"
import { memo } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useDictionary } from "@i18n/provider"
import { calculateLeaderTrustScore } from "@lib/util/group-deal-trust"
import { isCatalogDealClosed } from "@lib/util/group-deal-catalog"
import { convertToLocale } from "@lib/util/money"
import { getGroupDealFallbackImageUrl } from "@lib/util/landing-deals"
import { resolveGroupDealThumbnailUrl } from "@lib/util/product-group-deal"
import type { GroupDeal } from "types/group-deal"
import {
  getDaysUntilDeadline,
  getHoursUntilDeadline,
  getOptionRemainingQuantity,
  hasMemberVacancy,
  isDealSoldOut,
  isDepositSecured,
} from "types/group-deal"

import { BbMemberChipRow, MemberChipItem } from "./bb-member-chip-row"
import { cn } from "../cn"

type BbGroupBuyCardProps = {
  deal: GroupDeal
  highlightMember?: string
  className?: string
}

const formatMemberStatus = (template: string, member: string) =>
  template.replace("{member}", member)

const formatDeadlineLabel = (
  deal: GroupDeal,
  templates: {
    cardDaysHoursLeft: string
    cardEndsToday: string
  }
) => {
  const totalHours = getHoursUntilDeadline(deal)

  if (totalHours <= 0) {
    return templates.cardEndsToday
  }

  const days = getDaysUntilDeadline(deal)

  return days > 0 ? `D-${days}` : templates.cardEndsToday
}

const resolveThumbnailUrl = (deal: GroupDeal) =>
  resolveGroupDealThumbnailUrl(deal) ?? getGroupDealFallbackImageUrl(deal)

const BbGroupBuyCardComponent = ({
  deal,
  highlightMember,
  className,
}: BbGroupBuyCardProps) => {
  const t = useDictionary()
  const trust = calculateLeaderTrustScore(deal)
  const closed = isCatalogDealClosed(deal)
  const soldOut = isDealSoldOut(deal)
  const memberVacant =
    highlightMember && hasMemberVacancy(deal, highlightMember)
  const thumbnailUrl = resolveThumbnailUrl(deal)

  const memberOptions = (deal.options ?? []).filter(
    (option) => option.option_type === "member"
  )

  const memberChips: MemberChipItem[] = memberOptions.slice(0, 6).map(
    (option) => {
      const remaining = getOptionRemainingQuantity(option)
      const vacant = remaining == null || remaining > 0

      return {
        label: option.label,
        vacant,
        highlight: highlightMember === option.label && vacant,
      }
    }
  )

  const priceLabel = convertToLocale({
    amount: deal.deal_price,
    currency_code: deal.currency_code,
  })

  const deadlineLabel = closed
    ? t.groupBuying.cardClosedOverlay
    : soldOut
      ? t.groupBuying.cardWaitlistLabel
      : formatDeadlineLabel(deal, {
          cardDaysHoursLeft: t.groupBuying.cardDaysHoursLeft,
          cardEndsToday: t.groupBuying.cardEndsToday,
        })

  const metaLine = `${priceLabel} · ${deadlineLabel}`

  const cardClassName = cn(
    "relative flex gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-sm transition-colors",
    !closed && "hover:border-[#6B46E5]/40",
    closed && "cursor-default opacity-90",
    className
  )

  const cardBody = (
    <>
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#F3F4F6]">
        <Image
          src={thumbnailUrl}
          alt={deal.title}
          fill
          className="object-cover"
          sizes="80px"
          unoptimized
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[#111827]">
          {deal.title}
        </h3>

        {memberChips.length > 0 && <BbMemberChipRow members={memberChips} />}

        {highlightMember && (
          <p className="text-[10px] font-bold text-[#6B46E5]">
            {memberVacant
              ? formatMemberStatus(
                  t.groupBuying.cardMemberVacancy,
                  highlightMember
                )
              : soldOut
                ? formatMemberStatus(
                    t.groupBuying.cardMemberWaitlist,
                    highlightMember
                  )
                : formatMemberStatus(
                    t.groupBuying.cardMemberFull,
                    highlightMember
                  )}
          </p>
        )}

        <p className="text-xs text-[#9CA3AF]">{metaLine}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-xs font-semibold text-[#4B5563]">
            {t.groupBuying.cardTrustScore.replace(
              "{score}",
              trust.score.toFixed(0)
            )}
          </span>
          {isDepositSecured(deal) ? (
            <span className="inline-flex shrink-0 items-center rounded-lg border border-[#0B6E53] px-2 py-1 text-[10px] font-semibold text-[#0B6E53]">
              {t.groupBuying.depositSecuredBadge}
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center rounded-lg border border-[#E5E7EB] px-2 py-1 text-[10px] font-semibold text-[#6B7280]">
              보증금 예치
            </span>
          )}
        </div>
      </div>

      {closed && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-black/40"
          aria-hidden
        >
          <span className="rounded-full bg-[#F3F4F6] px-3 py-1.5 text-xs font-bold text-[#9CA3AF]">
            {t.groupBuying.cardClosedOverlay}
          </span>
        </div>
      )}
    </>
  )

  if (closed) {
    return (
      <div className={cardClassName} aria-disabled="true" data-closed="true">
        {cardBody}
      </div>
    )
  }

  return (
    <LocalizedClientLink href={`/deals/${deal.id}`} className={cardClassName}>
      {cardBody}
    </LocalizedClientLink>
  )
}

export const BbGroupBuyCard = memo(BbGroupBuyCardComponent)

export default BbGroupBuyCard
