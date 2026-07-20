"use client"

import { useMemo, useState } from "react"

import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  resolveHostedDealAchievementPercent,
  resolveHostedDealTab,
  shouldShowHostedDealParticipantProgress,
  type HostedDealTab,
} from "@lib/util/seller-deal-metrics"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { BbButton, BbCard, BbTabs } from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type { AccountGroupDeal } from "types/account-group-deals"

type HostedDealsListLabels = {
  empty: string
  createCta: string
  tabDraft: string
  tabRecruiting: string
  tabActive: string
  tabCompleted: string
  emptyDraft: string
  emptyRecruiting: string
  emptyActive: string
  emptyCompleted: string
  footerNotice: string
  achievementRate: string
  leaderStages: Record<string, string>
}

type HostedDealsListProps = {
  deals: AccountGroupDeal[]
  countryCode: string
  labels: HostedDealsListLabels
}

const TAB_ITEMS: { id: HostedDealTab; labelKey: keyof HostedDealsListLabels }[] =
  [
    { id: "draft", labelKey: "tabDraft" },
    { id: "recruiting", labelKey: "tabRecruiting" },
    { id: "active", labelKey: "tabActive" },
    { id: "completed", labelKey: "tabCompleted" },
  ]

const EMPTY_LABEL_KEYS: Record<
  HostedDealTab,
  "emptyDraft" | "emptyRecruiting" | "emptyActive" | "emptyCompleted"
> = {
  draft: "emptyDraft",
  recruiting: "emptyRecruiting",
  active: "emptyActive",
  completed: "emptyCompleted",
}

const resolveStageLabel = (
  deal: AccountGroupDeal,
  leaderStages: Record<string, string>
) => {
  if (
    deal.leader_stage === "deposit_pending" &&
    deal.deposit_status !== "deposited"
  ) {
    return leaderStages.deposit_pending ?? deal.leader_stage
  }

  return leaderStages[deal.leader_stage] ?? deal.leader_stage
}

const resolveProgressLabel = (
  deal: AccountGroupDeal,
  achievementRateTemplate: string
) => {
  if (shouldShowHostedDealParticipantProgress(deal)) {
    return `${deal.current_participants}/${deal.target_quantity}`
  }

  return achievementRateTemplate.replace(
    "{percent}",
    String(resolveHostedDealAchievementPercent(deal))
  )
}

const HostedDealsList = ({
  deals,
  countryCode,
  labels,
}: HostedDealsListProps) => {
  const [activeTab, setActiveTab] = useState<HostedDealTab>("recruiting")

  const grouped = useMemo(() => {
    const buckets: Record<HostedDealTab, AccountGroupDeal[]> = {
      draft: [],
      recruiting: [],
      active: [],
      completed: [],
    }

    for (const deal of deals) {
      buckets[resolveHostedDealTab(deal)].push(deal)
    }

    return buckets
  }, [deals])

  const visible = grouped[activeTab]

  if (!deals.length) {
    return (
      <div className="flex flex-col gap-4">
        <Text className="text-sm text-[var(--bb-mute)]">{labels.empty}</Text>
        <LocalizedClientLink href={gbAppRoutes.sellerCreate(countryCode)}>
          <BbButton fullWidth>{labels.createCta}</BbButton>
        </LocalizedClientLink>
        <Text className="border-l-2 border-[var(--bb-line)] bg-[#F7F6FB] px-2 py-1 text-xs text-[var(--bb-mute)]">
          {labels.footerNotice}
        </Text>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <BbTabs
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as HostedDealTab)}
        items={TAB_ITEMS.map((tab) => ({
          id: tab.id,
          label: labels[tab.labelKey],
          count: grouped[tab.id].length,
        }))}
      />

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--bb-line)] px-4 py-8 text-center text-sm text-[var(--bb-mute)]">
          {labels[EMPTY_LABEL_KEYS[activeTab]]}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((deal) => (
            <LocalizedClientLink
              key={deal.id}
              href={gbAppRoutes.sellerDeal(countryCode, deal.id)}
            >
              <BbCard
                padding="md"
                className="transition-colors hover:border-brand-purple/40"
              >
                <Text className="text-sm font-black text-[var(--bb-ink)]">
                  {deal.title}
                </Text>
                <Text className="mt-1 text-xs text-[var(--bb-mute)]">
                  {resolveProgressLabel(deal, labels.achievementRate)} ·{" "}
                  {resolveStageLabel(deal, labels.leaderStages)}
                </Text>
              </BbCard>
            </LocalizedClientLink>
          ))}
        </div>
      )}

      <LocalizedClientLink href={gbAppRoutes.sellerCreate(countryCode)}>
        <BbButton variant="secondary" fullWidth>
          {labels.createCta}
        </BbButton>
      </LocalizedClientLink>

      <Text className="border-l-2 border-[var(--bb-line)] bg-[#F7F6FB] px-2 py-1 text-xs text-[var(--bb-mute)]">
        {labels.footerNotice}
      </Text>
    </div>
  )
}

export default HostedDealsList
