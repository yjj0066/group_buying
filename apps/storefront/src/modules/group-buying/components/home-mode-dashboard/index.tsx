"use client"

import { useMemo } from "react"

import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import GroupBuyingModeSwitcher from "@modules/group-buying/components/group-buying-mode-switcher"
import { useGroupBuyingMode } from "@modules/group-buying/components/group-buying-mode-provider"
import GroupDealCardList from "@modules/group-buying/components/group-deal-card-list"
import ParticipantHomeBrowse from "@modules/group-buying/components/participant-home-browse"
import {
  BbButton,
  BbCard,
  BbKpiGrid,
  BbSectionHeader,
  cn,
} from "@modules/design-system"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"
import type { GroupDeal } from "types/group-deal"
import { getDealFillProgress } from "types/group-deal"
import { useParams } from "next/navigation"

type HomeModeDashboardProps = {
  deals: GroupDeal[]
  hostedDeals: GroupDeal[]
  favoriteMember?: string
  initialPreferences?: {
    favorite_idol_group: string | null
    favorite_member: string | null
  } | null
}

const DealSection = ({
  title,
  deals,
  highlightMember,
  viewAllHref,
  emptyMessage,
  maxItems = 3,
  layout = "stack",
}: {
  title: string
  deals: GroupDeal[]
  highlightMember?: string
  viewAllHref?: string
  emptyMessage: string
  maxItems?: number
  layout?: "stack" | "grid"
}) => {
  const t = useDictionary()
  const visibleDeals = deals.slice(0, maxItems)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <BbSectionHeader title={title} className="mb-0" />
        {viewAllHref && deals.length > 0 && (
          <LocalizedClientLink
            href={viewAllHref}
            className="shrink-0 text-xs font-bold text-brand-purple"
          >
            {t.landing.viewAll}
          </LocalizedClientLink>
        )}
      </div>

      {visibleDeals.length === 0 ? (
        <BbCard padding="md">
          <Text className="text-sm text-[var(--bb-mute)]">{emptyMessage}</Text>
        </BbCard>
      ) : (
        <GroupDealCardList
          deals={visibleDeals}
          highlightMember={highlightMember}
          layout={layout}
          className={
            layout === "grid"
              ? "grid grid-cols-2 gap-3"
              : "flex flex-col gap-3"
          }
        />
      )}
    </section>
  )
}

const SellerDashboard = ({ hostedDeals }: { hostedDeals: GroupDeal[] }) => {
  const t = useDictionary()
  const { countryCode } = useParams() as { countryCode: string }
  const gb = t.gbApp

  const activeDeals = hostedDeals.filter((deal) => deal.status !== "completed")
  const completedCount = hostedDeals.filter(
    (deal) => deal.status === "completed"
  ).length
  const inProgressCount = activeDeals.filter(
    (deal) => deal.status === "recruiting" || deal.status === "open"
  ).length
  const depositPendingCount = activeDeals.filter(
    (deal) => deal.status === "deposit_pending"
  ).length
  const vacantSeatCount = activeDeals.reduce((sum, deal) => {
    const { filled, total } = getDealFillProgress(deal)
    return sum + Math.max(0, total - filled)
  }, 0)
  const shippingCount = activeDeals.filter(
    (deal) => deal.status === "shipping"
  ).length

  const nextActions = activeDeals.flatMap((deal) => {
    const actions: Array<{ dealId: string; label: string; href: string }> = []

    if (deal.status === "purchase") {
      actions.push({
        dealId: deal.id,
        label: gb.leaderActionPurchase,
        href: gbAppRoutes.sellerPurchaseProof(countryCode, deal.id),
      })
    }

    if (deal.status === "shipping") {
      actions.push({
        dealId: deal.id,
        label: gb.leaderActionShipping,
        href: gbAppRoutes.sellerShipping(countryCode, deal.id),
      })
    }

    if (deal.is_urgent_fill && deal.status === "recruiting") {
      actions.push({
        dealId: deal.id,
        label: gb.leaderActionUrgentFill,
        href: gbAppRoutes.sellerUrgentFill(countryCode, deal.id),
      })
    }

    return actions
  })

  return (
    <div className="flex flex-col gap-6">
      <BbSectionHeader
        title={gb.leaderDashboardTitle}
        subtitle={gb.leaderDashboardSubtitle.replace(
          "{count}",
          String(activeDeals.length)
        )}
      />

      <div className="rounded-2xl border border-[var(--bb-line)] bg-[var(--bb-surface)] p-4">
        <p className="mb-3 text-xs font-bold text-[var(--bb-mute)]">
          {gb.leaderKpiSectionLabel}
        </p>
        <BbKpiGrid
          columns={2}
          items={[
            {
              label: gb.leaderKpiInProgress,
              value: String(inProgressCount),
            },
            {
              label: gb.leaderKpiDepositPending,
              value: String(depositPendingCount),
            },
            {
              label: gb.leaderKpiVacantSeats,
              value: String(vacantSeatCount),
            },
            {
              label: gb.leaderKpiShipping,
              value: String(shippingCount),
            },
          ]}
        />
        {completedCount > 0 && (
          <Text className="mt-3 text-xs text-[var(--bb-mute)]">
            {gb.leaderKpiCompleted.replace("{count}", String(completedCount))}
          </Text>
        )}
      </div>

      {activeDeals.length > 0 && (
        <DealSection
          title={gb.leaderActiveDealsTitle}
          deals={activeDeals}
          maxItems={2}
          layout="grid"
          emptyMessage={t.groupBuying.emptyFiltered}
        />
      )}

      {nextActions.length > 0 && (
        <section className="flex flex-col gap-3">
          <BbSectionHeader title={gb.leaderNextActionsTitle} />
          <div className="flex flex-col gap-2">
            {nextActions.slice(0, 4).map((action) => (
              <LocalizedClientLink key={`${action.dealId}-${action.label}`} href={action.href}>
                <BbCard
                  padding="md"
                  className="flex items-center justify-between gap-3 transition-colors hover:border-brand-purple/30"
                >
                  <Text className="text-sm font-semibold text-[var(--bb-ink)]">
                    {action.label}
                  </Text>
                  <span className="text-brand-purple">→</span>
                </BbCard>
              </LocalizedClientLink>
            ))}
          </div>
        </section>
      )}

      <LocalizedClientLink href={gbAppRoutes.sellerCreate(countryCode)}>
        <BbButton fullWidth>{gb.leaderCreateCta}</BbButton>
      </LocalizedClientLink>
    </div>
  )
}

const BuyerDashboard = ({
  deals,
  initialPreferences,
}: {
  deals: GroupDeal[]
  initialPreferences?: HomeModeDashboardProps["initialPreferences"]
}) => (
  <ParticipantHomeBrowse deals={deals} initialPreferences={initialPreferences} />
)

const HomeModeDashboard = ({
  deals,
  hostedDeals,
  initialPreferences,
}: HomeModeDashboardProps) => {
  const { mode } = useGroupBuyingMode()

  return (
    <div className="flex flex-col gap-6" data-testid="gb-app-home">
      <GroupBuyingModeSwitcher />

      {mode === "participant" ? (
        <BuyerDashboard
          deals={deals}
          initialPreferences={initialPreferences}
        />
      ) : (
        <SellerDashboard hostedDeals={hostedDeals} />
      )}
    </div>
  )
}

export default HomeModeDashboard
