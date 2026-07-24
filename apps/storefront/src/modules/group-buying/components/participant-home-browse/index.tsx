"use client"

import { useMemo, useState } from "react"

import { useDebouncedValue } from "@lib/hooks/use-debounced-value"
import {
  DEFAULT_GROUP_DEAL_FILTERS,
  extractGroupDealFacets,
  filterGroupDeals,
} from "@lib/util/group-deal-filters"
import {
  filterDealsByCatalogTab,
  type CatalogStatusTab,
} from "@lib/util/group-deal-catalog"
import { useDictionary } from "@i18n/provider"
import GroupDealCardList from "@modules/group-buying/components/group-deal-card-list"
import { BbChip, BbSearchInput, BbTabs } from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type { GroupDeal } from "types/group-deal"

type ParticipantHomeBrowseProps = {
  deals: GroupDeal[]
  initialPreferences?: {
    favorite_idol_group: string | null
    favorite_member: string | null
  } | null
}

const ParticipantHomeBrowse = ({
  deals,
  initialPreferences,
}: ParticipantHomeBrowseProps) => {
  const t = useDictionary()
  const gb = t.gbApp
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query, 200)
  const [statusTab, setStatusTab] = useState<CatalogStatusTab>("all")
  const [selectedIdols, setSelectedIdols] = useState<string[]>(() => {
    const favorite = initialPreferences?.favorite_idol_group?.trim()
    return favorite ? [favorite] : []
  })

  const facets = useMemo(() => extractGroupDealFacets(deals), [deals])

  const idolGroups = useMemo(() => {
    const groups = new Set(facets.idolGroups)
    const favorite = initialPreferences?.favorite_idol_group?.trim()

    if (favorite) {
      groups.add(favorite)
    }

    return Array.from(groups).sort()
  }, [facets.idolGroups, initialPreferences?.favorite_idol_group])

  const filteredDeals = useMemo(() => {
    const searched = filterGroupDeals(deals, {
      ...DEFAULT_GROUP_DEAL_FILTERS,
      catalogTab: "all",
      query: debouncedQuery,
    })

    const byIdol =
      selectedIdols.length === 0
        ? searched
        : searched.filter((deal) => {
            const group = deal.metadata?.idol_group
            return typeof group === "string" && selectedIdols.includes(group)
          })

    return filterDealsByCatalogTab(byIdol, statusTab)
  }, [deals, debouncedQuery, selectedIdols, statusTab])

  const toggleIdol = (group: string) => {
    setSelectedIdols((current) =>
      current.includes(group)
        ? current.filter((item) => item !== group)
        : [...current, group]
    )
  }

  const statusTabs = [
    { id: "all", label: gb.homeTabAll },
    { id: "in_progress", label: gb.homeTabInProgress },
    { id: "closed", label: gb.homeTabClosed },
  ]

  return (
    <div className="flex flex-col gap-4 pb-2" data-testid="participant-home-browse">
      {idolGroups.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="home-idol-chips">
          {idolGroups.map((group) => (
            <BbChip
              key={group}
              active={selectedIdols.includes(group)}
              onClick={() => toggleIdol(group)}
            >
              {group}
            </BbChip>
          ))}
        </div>
      )}

      <BbSearchInput
        placeholder={gb.homeSearchPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        data-testid="home-search-input"
      />

      <BbTabs
        items={statusTabs}
        activeId={statusTab}
        onChange={(id) => setStatusTab(id as CatalogStatusTab)}
      />

      <Text className="text-xs text-[var(--bb-mute)]">
        {t.groupBuying.resultsCount.replace(
          "{count}",
          String(filteredDeals.length)
        )}
      </Text>

      {filteredDeals.length === 0 ? (
        <Text className="py-8 text-center text-sm text-[var(--bb-mute)]">
          {t.groupBuying.emptyFiltered}
        </Text>
      ) : (
        <GroupDealCardList deals={filteredDeals} />
      )}
    </div>
  )
}

export default ParticipantHomeBrowse
