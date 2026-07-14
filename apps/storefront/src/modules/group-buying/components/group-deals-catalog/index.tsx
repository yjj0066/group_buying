"use client"

import { useMemo, useState } from "react"

import GroupDealCard from "@modules/group-buying/components/group-deal-card"
import GroupDealFilters, {
  DEFAULT_GROUP_DEAL_FILTERS,
  extractGroupDealFacets,
  filterGroupDeals,
} from "@modules/group-buying/components/group-deal-filters"
import { useDictionary } from "@i18n/provider"
import { Heading, Text } from "@modules/common/components/ui"
import type { GroupDeal } from "types/group-deal"

type GroupDealsCatalogProps = {
  deals: GroupDeal[]
}

const GroupDealsCatalog = ({ deals }: GroupDealsCatalogProps) => {
  const t = useDictionary()
  const [filters, setFilters] = useState(DEFAULT_GROUP_DEAL_FILTERS)

  const facets = useMemo(() => extractGroupDealFacets(deals), [deals])
  const filteredDeals = useMemo(
    () => filterGroupDeals(deals, filters),
    [deals, filters]
  )

  return (
    <div className="content-container py-10">
      <div className="mb-8 flex flex-col gap-y-2">
        <Heading level="h1" className="text-2xl font-semibold">
          {t.groupBuying.title}
        </Heading>
        <Text className="text-ui-fg-subtle">{t.groupBuying.listDescription}</Text>
      </div>

      <div className="grid grid-cols-1 gap-8 large:grid-cols-[280px_1fr]">
        <GroupDealFilters
          deals={deals}
          filters={filters}
          facets={facets}
          onChange={setFilters}
        />

        <div className="flex flex-col gap-y-4">
          <Text className="text-small-regular text-ui-fg-subtle">
            {t.groupBuying.resultsCount.replace(
              "{count}",
              String(filteredDeals.length)
            )}
          </Text>

          {filteredDeals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ui-border-base p-10 text-center">
              <Text className="text-ui-fg-subtle">{t.groupBuying.emptyFiltered}</Text>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 medium:grid-cols-2">
              {filteredDeals.map((deal) => (
                <GroupDealCard
                  key={deal.id}
                  deal={deal}
                  highlightMember={filters.favoriteMember || filters.member}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GroupDealsCatalog
