import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Heading, Text } from "@modules/common/components/ui"
import { convertToLocale } from "@lib/util/money"
import { GroupDeal } from "types/group-deal"
import GroupDealProgress from "../group-deal-progress"

type GroupDealCardProps = {
  deal: GroupDeal
}

const GroupDealCard = ({ deal }: GroupDealCardProps) => {
  const discount = Math.round(
    ((deal.original_price - deal.deal_price) / deal.original_price) * 100
  )

  const endsAt = new Date(deal.ends_at)
  const daysLeft = Math.max(
    0,
    Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )

  return (
    <LocalizedClientLink
      href={`/group-buying/${deal.id}`}
      className="flex flex-col gap-y-4 p-6 border border-ui-border-base rounded-lg hover:border-ui-border-interactive transition-colors bg-white"
    >
      <div className="flex justify-between items-start gap-x-4">
        <Heading level="h3" className="text-lg font-medium">
          {deal.title}
        </Heading>
        <span className="shrink-0 px-2 py-1 text-xs font-medium bg-ui-tag-green-bg text-ui-tag-green-text rounded">
          {discount}% 할인
        </span>
      </div>

      {deal.description && (
        <Text className="text-ui-fg-subtle text-small-regular line-clamp-2">
          {deal.description}
        </Text>
      )}

      <GroupDealProgress deal={deal} />

      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-y-1">
          <Text className="text-ui-fg-muted text-small-regular line-through">
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
          {daysLeft > 0 ? `${daysLeft}일 남음` : "오늘 마감"}
        </Text>
      </div>
    </LocalizedClientLink>
  )
}

export default GroupDealCard
