"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Heading, Text } from "@modules/common/components/ui"
import { convertToLocale } from "@lib/util/money"
import { useDictionary } from "@i18n/provider"
import {
  getOptionRemainingQuantity,
  GroupDeal,
  hasMemberVacancy,
  isDealSoldOut,
  isDepositSecured,
} from "types/group-deal"
import GroupDealProgress from "../group-deal-progress"

type GroupDealCardProps = {
  deal: GroupDeal
  highlightMember?: string
}

const formatMemberStatus = (
  template: string,
  member: string
) => template.replace("{member}", member)

const GroupDealCard = ({ deal, highlightMember }: GroupDealCardProps) => {
  const t = useDictionary()

  const discount = Math.round(
    ((deal.original_price - deal.deal_price) / deal.original_price) * 100
  )

  const endsAt = new Date(deal.ends_at)
  const daysLeft = Math.max(
    0,
    Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )

  const soldOut = isDealSoldOut(deal)
  const memberVacant =
    highlightMember && hasMemberVacancy(deal, highlightMember)

  const memberOptions = (deal.options ?? []).filter(
    (option) => option.option_type === "member"
  )

  return (
    <LocalizedClientLink
      href={`/group-buying/${deal.id}`}
      className="flex flex-col gap-y-4 rounded-lg border border-ui-border-base bg-white p-6 transition-colors hover:border-ui-border-interactive"
    >
      <div className="flex items-start justify-between gap-x-4">
        <Heading level="h3" className="text-lg font-medium">
          {deal.title}
        </Heading>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="px-2 py-1 text-xs font-medium rounded bg-ui-tag-green-bg text-ui-tag-green-text">
            {discount}%
          </span>
          {isDepositSecured(deal) && (
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              {t.groupBuying.depositSecuredBadge}
            </span>
          )}
        </div>
      </div>

      {deal.metadata?.idol_group && (
        <Text className="text-xs font-medium text-violet-600">
          {String(deal.metadata.idol_group)}
        </Text>
      )}

      {deal.description && (
        <Text className="line-clamp-2 text-small-regular text-ui-fg-subtle">
          {deal.description}
        </Text>
      )}

      {memberOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {memberOptions.slice(0, 4).map((option) => {
            const remaining = getOptionRemainingQuantity(option)
            const isVacant = remaining == null || remaining > 0

            return (
              <span
                key={option.id}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  isVacant
                    ? "bg-sky-50 text-sky-700"
                    : "bg-ui-bg-subtle text-ui-fg-muted line-through"
                }`}
              >
                {option.label}
                {remaining != null ? ` (${remaining})` : ""}
              </span>
            )
          })}
        </div>
      )}

      {highlightMember && (
        <Text className="text-xs font-semibold text-ui-fg-interactive">
          {memberVacant
            ? formatMemberStatus(t.groupBuying.cardMemberVacancy, highlightMember)
            : soldOut
              ? formatMemberStatus(
                  t.groupBuying.cardMemberWaitlist,
                  highlightMember
                )
              : formatMemberStatus(t.groupBuying.cardMemberFull, highlightMember)}
        </Text>
      )}

      <GroupDealProgress deal={deal} />

      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-y-1">
          <Text className="text-small-regular text-ui-fg-muted line-through">
            {convertToLocale({
              amount: deal.original_price,
              currency_code: deal.currency_code,
            })}
          </Text>
          <Text className="text-lg font-semibold text-ui-fg-base">
            {convertToLocale({
              amount: deal.deal_price,
              currency_code: deal.currency_code,
            })}
          </Text>
        </div>
        <Text className="text-small-regular text-ui-fg-subtle">
          {soldOut
            ? t.groupBuying.cardWaitlistLabel
            : daysLeft > 0
              ? t.groupBuying.cardDaysLeft.replace("{days}", String(daysLeft))
              : t.groupBuying.cardEndsToday}
        </Text>
      </div>
    </LocalizedClientLink>
  )
}

export default GroupDealCard
