import Image from "next/image"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { getServerDictionary } from "@i18n/server"
import GroupDealProgress from "@modules/group-buying/components/group-deal-progress"
import GroupDealTimeline from "@modules/group-buying/components/group-deal-timeline"
import DealJoinSection from "@modules/group-buying/components/deal-join-section"
import PurchaseReceiptPanel from "@modules/group-buying/components/purchase-receipt-panel"
import LeaderTrustPanel from "@modules/group-buying/components/leader-trust-panel"
import AiRecommendationSlider from "@modules/products/components/ai-recommendation-slider"
import { Heading, Text } from "@modules/common/components/ui"
import type { GroupDeal } from "types/group-deal"
import { getDealDiscountPercent, isDealAtCapacity } from "types/group-deal"

type GroupDealDetailTemplateProps = {
  groupDeal: GroupDeal
  heroImageUrl?: string | null
  countryCode?: string
}

const GroupDealDetailTemplate = async ({
  groupDeal,
  heroImageUrl = null,
  countryCode = "kr",
}: GroupDealDetailTemplateProps) => {
  const t = await getServerDictionary()
  const originalPrice = groupDeal.original_price ?? 0
  const dealPrice = groupDeal.deal_price ?? 0
  const discount = getDealDiscountPercent(groupDeal)
  const atCapacity = isDealAtCapacity(groupDeal)
  const perCapitaShipping =
    groupDeal.per_capita_shipping_fee ??
    (groupDeal.metadata?.per_capita_shipping_fee as number | undefined)

  return (
    <div className="content-container py-10">
      <LocalizedClientLink
        href="/group-buying"
        className="mb-6 inline-block text-sm text-ui-fg-subtle hover:text-ui-fg-base"
      >
        {t.groupBuying.backToList}
      </LocalizedClientLink>

      <div className="mb-8">
        <LeaderTrustPanel deal={groupDeal} />
      </div>

      <div className="mb-8">
        <GroupDealTimeline deal={groupDeal} />
      </div>

      <div className="grid grid-cols-1 gap-10 medium:grid-cols-2">
        <div className="flex flex-col gap-y-6">
          {heroImageUrl && (
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-ui-border-base bg-ui-bg-subtle">
              <Image
                src={heroImageUrl}
                alt={groupDeal.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>
          )}

          <div>
            <Heading level="h1" className="text-2xl font-semibold">
              {groupDeal.title}
            </Heading>
            {groupDeal.metadata?.idol_group && (
              <Text className="mt-1 text-sm font-medium text-violet-600">
                {String(groupDeal.metadata.idol_group)}
              </Text>
            )}
            {groupDeal.description && (
              <Text className="mt-4 text-ui-fg-subtle">
                {groupDeal.description}
              </Text>
            )}
          </div>

          <GroupDealProgress deal={groupDeal} />

          <PurchaseReceiptPanel deal={groupDeal} />

          <div className="flex items-end gap-x-4">
            <Text className="text-small-regular text-ui-fg-muted line-through">
              {convertToLocale({
                amount: originalPrice,
                currency_code: groupDeal.currency_code,
              })}
            </Text>
            <Text className="text-2xl font-bold text-ui-fg-base">
              {convertToLocale({
                amount: dealPrice,
                currency_code: groupDeal.currency_code,
              })}
            </Text>
            <span className="rounded bg-ui-tag-green-bg px-2 py-1 text-xs font-medium text-ui-tag-green-text">
              {discount}% {t.groupBuying.discount}
            </span>
          </div>

          {atCapacity && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Text className="text-sm font-medium text-blue-900">
                {t.groupBuying.fixedShippingFeeNotice}
              </Text>
              {perCapitaShipping != null && (
                <Text className="mt-1 text-sm text-blue-800">
                  {convertToLocale({
                    amount: perCapitaShipping,
                    currency_code: groupDeal.currency_code,
                  })}
                </Text>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-y-4">
          <Heading level="h2" className="text-xl font-semibold">
            {t.groupBuying.joinTitle}
          </Heading>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <Text className="text-sm font-semibold text-emerald-900">
              {t.groupBuying.escrowNoticeTitle}
            </Text>
            <Text className="mt-1 text-sm text-emerald-800">
              {t.groupBuying.escrowNoticeDescription}
            </Text>
          </div>

          <DealJoinSection deal={groupDeal} />
        </div>
      </div>

      {groupDeal.product_id && !groupDeal.product_id.startsWith("demo-") && (
        <div className="mt-16 border-t border-ui-border-base pt-12">
          <AiRecommendationSlider
            context="similar"
            countryCode={countryCode}
            productId={groupDeal.product_id}
            title={t.products.relatedProducts}
            subtitle={t.products.relatedProductsDescription}
            viewAllHref="/group-buying"
            viewAllLabel={t.groupBuying.title}
            limit={8}
          />
        </div>
      )}
    </div>
  )
}

export default GroupDealDetailTemplate
