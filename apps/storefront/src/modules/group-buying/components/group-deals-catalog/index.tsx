"use client"

import { memo, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"

import GroupDealCardList from "@modules/group-buying/components/group-deal-card-list"
import SearchEmptyResults from "@modules/group-buying/components/search-empty-results"
import {
  extractGroupDealFacets,
  filterGroupDeals,
  hasActiveFilters,
  type GroupDealFilterState,
} from "@lib/util/group-deal-filters"
import GroupDealFilters from "@modules/group-buying/components/group-deal-filters"
import useGroupDealSearch from "@modules/group-buying/hooks/use-group-deal-search"
import useSoftRouterRefresh from "@lib/hooks/use-soft-router-refresh"
import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { BbPageShell, BbSectionHeader } from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type { GroupDeal } from "types/group-deal"
import { isStoreVisibleDeal } from "@lib/util/normalize-group-deal"

type GroupDealsCatalogProps = {
  deals: GroupDeal[]
  initialFilters?: GroupDealFilterState
}

type CatalogResultsProps = {
  filteredDeals: GroupDeal[]
  highlightMember?: string
  resultsLabel: string
  onWaitlist: () => void
  onReset: () => void
  showReset: boolean
}

const CatalogResults = memo(function CatalogResults({
  filteredDeals,
  highlightMember,
  resultsLabel,
  onWaitlist,
  onReset,
  showReset,
}: CatalogResultsProps) {
  return (
    <div className="flex flex-col gap-y-5">
      {filteredDeals.length > 0 && (
        <Text className="text-sm font-medium text-[var(--bb-mute)]">
          {resultsLabel}
        </Text>
      )}

      {filteredDeals.length === 0 ? (
        <SearchEmptyResults
          onWaitlist={onWaitlist}
          onReset={onReset}
          showReset={showReset}
        />
      ) : (
        <GroupDealCardList
          deals={filteredDeals}
          highlightMember={highlightMember}
          layout="grid"
        />
      )}
    </div>
  )
})

const GroupDealsCatalog = ({
  deals,
  initialFilters,
}: GroupDealsCatalogProps) => {
  const t = useDictionary()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const {
    draftFilters,
    setDraftFilters,
    appliedFilters,
    applySearch,
    resetSearch,
  } = useGroupDealSearch({ initialFilters })

  useSoftRouterRefresh()

  const visibleDeals = useMemo(
    () => deals.filter(isStoreVisibleDeal),
    [deals]
  )

  const facets = useMemo(
    () => extractGroupDealFacets(visibleDeals),
    [visibleDeals]
  )
  const filteredDeals = useMemo(
    () => filterGroupDeals(visibleDeals, appliedFilters),
    [visibleDeals, appliedFilters]
  )
  const resultsLabel = t.groupBuying.resultsCount.replace(
    "{count}",
    String(filteredDeals.length)
  )
  const highlightMember =
    appliedFilters.favoriteMember || appliedFilters.member || undefined

  return (
    <BbPageShell>
      <div className="content-container py-10 small:py-12">
        <BbSectionHeader
          title={t.groupBuying.title}
          subtitle={t.groupBuying.listDescription}
        />

        <div className="grid grid-cols-1 gap-8 large:grid-cols-[300px_1fr]">
          <GroupDealFilters
            deals={visibleDeals}
            filters={draftFilters}
            facets={facets}
            onChange={setDraftFilters}
            onApply={applySearch}
            onReset={resetSearch}
          />

          <CatalogResults
            filteredDeals={filteredDeals}
            highlightMember={highlightMember}
            resultsLabel={resultsLabel}
            onWaitlist={() =>
              router.push(
                `${gbAppRoutes.waitlist(countryCode)}?${new URLSearchParams({
                  q: appliedFilters.query,
                  member: appliedFilters.favoriteMember,
                }).toString()}`
              )
            }
            onReset={resetSearch}
            showReset={hasActiveFilters(appliedFilters)}
          />
        </div>
      </div>
    </BbPageShell>
  )
}

export default GroupDealsCatalog
