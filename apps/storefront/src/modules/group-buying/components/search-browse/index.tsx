"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"

import {
  filtersToSearchParams,
  parseFiltersFromSearchParams,
} from "@lib/util/group-deal-filter-url"
import {
  buildInitialFiltersFromPreferences,
  DEFAULT_GROUP_DEAL_FILTERS,
  extractGroupDealFacets,
  filterGroupDeals,
  hasActiveFilters,
  type GroupDealFilterState,
} from "@lib/util/group-deal-filters"
import { isStoreVisibleDeal } from "@lib/util/normalize-group-deal"
import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import GroupDealCardList from "@modules/group-buying/components/group-deal-card-list"
import SearchEmptyResults from "@modules/group-buying/components/search-empty-results"
import SearchFilterBar from "@modules/group-buying/components/search-filter-bar"
import {
  BbChip,
  BbHighlightBanner,
  BbSearchInput,
  BbSectionHeader,
} from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type { GroupDeal } from "types/group-deal"

type SearchBrowseProps = {
  deals: GroupDeal[]
  initialPreferences?: {
    favorite_idol_group: string | null
    favorite_member: string | null
  } | null
}

const buildFiltersFromSearchParams = (
  searchParams: URLSearchParams,
  initialPreferences?: SearchBrowseProps["initialPreferences"]
) =>
  buildInitialFiltersFromPreferences(initialPreferences, {
    ...parseFiltersFromSearchParams(searchParams, {
      favoriteMember: initialPreferences?.favorite_member ?? "",
      idolGroup: initialPreferences?.favorite_idol_group ?? "",
    }),
  })

const SearchBrowse = ({ deals, initialPreferences }: SearchBrowseProps) => {
  const t = useDictionary()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const searchParams = useSearchParams()
  const searchKey = searchParams.toString()

  const [filters, setFilters] = useState<GroupDealFilterState>(() =>
    buildFiltersFromSearchParams(searchParams, initialPreferences)
  )
  const [searchInput, setSearchInput] = useState(() => filters.query)
  const [appliedFilters, setAppliedFilters] = useState<GroupDealFilterState>(
    () => buildFiltersFromSearchParams(searchParams, initialPreferences)
  )

  useEffect(() => {
    const fromUrl = buildFiltersFromSearchParams(searchParams, initialPreferences)
    setFilters(fromUrl)
    setSearchInput(fromUrl.query)
    setAppliedFilters(fromUrl)
  }, [searchKey, initialPreferences])

  const visibleDeals = useMemo(
    () => deals.filter(isStoreVisibleDeal),
    [deals]
  )

  const facets = useMemo(() => extractGroupDealFacets(visibleDeals), [visibleDeals])
  const filtered = useMemo(
    () =>
      filterGroupDeals(visibleDeals, {
        ...appliedFilters,
        ...filters,
        query: appliedFilters.query,
      }),
    [visibleDeals, appliedFilters, filters]
  )

  const runSearch = () => {
    const nextFilters: GroupDealFilterState = {
      ...filters,
      query: searchInput.trim(),
    }

    setFilters(nextFilters)
    setAppliedFilters(nextFilters)

    const params = filtersToSearchParams(nextFilters)
    const queryString = params.toString()
    const target = queryString
      ? `${gbAppRoutes.search(countryCode)}?${queryString}`
      : gbAppRoutes.search(countryCode)

    router.replace(target, { scroll: false })
    router.refresh()
  }

  const resetFilters = () => {
    const reset = {
      ...DEFAULT_GROUP_DEAL_FILTERS,
      favoriteMember: initialPreferences?.favorite_member ?? "",
      idolGroup: initialPreferences?.favorite_idol_group ?? "",
    }

    setSearchInput("")
    setFilters(reset)
    setAppliedFilters(reset)
    router.replace(gbAppRoutes.search(countryCode), { scroll: false })
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <BbSectionHeader title={t.groupBuying.title} subtitle={t.groupBuying.listDescription} />

      <BbSearchInput
        placeholder="아이돌·멤버·굿즈 검색"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        onSearch={runSearch}
      />

      <SearchFilterBar
        filters={filters}
        facets={facets}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
      />

      <div className="flex justify-end">
        <select
          className="h-9 rounded-full border border-[#E5E7EB] bg-white px-3 text-xs font-medium text-[#4B5563]"
          value={filters.sortBy}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              sortBy: event.target.value as GroupDealFilterState["sortBy"],
            }))
          }
          data-testid="search-sort-select"
        >
          <option value="deadline">{t.groupBuying.sortDeadline}</option>
          <option value="newest">{t.groupBuying.sortNewest}</option>
        </select>
      </div>

      <BbHighlightBanner className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold">
          ★ {t.groupBuying.vacantOnlyToggle}
        </span>
        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border border-[#DDD6FE] bg-white px-2 py-1 text-xs font-semibold text-[#4338CA]"
            value={filters.favoriteMember}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                favoriteMember: event.target.value,
                vacantOnly: true,
              }))
            }
          >
            <option value="">{t.groupBuying.favoriteMemberPlaceholder}</option>
            {facets.members.map((member) => (
              <option key={member} value={member}>
                {member}
              </option>
            ))}
          </select>
          <BbChip
            active={filters.vacantOnly}
            onClick={() =>
              setFilters((current) => ({
                ...current,
                vacantOnly: !current.vacantOnly,
              }))
            }
          >
            ON
          </BbChip>
        </div>
      </BbHighlightBanner>

      {filtered.length > 0 && (
        <Text className="text-xs text-[#9CA3AF]">
          {t.groupBuying.resultsCount.replace("{count}", String(filtered.length))}
        </Text>
      )}

      {filtered.length === 0 ? (
        <SearchEmptyResults
          onWaitlist={() =>
            router.push(
              `${gbAppRoutes.waitlist(countryCode)}?${new URLSearchParams({
                q: appliedFilters.query,
                member: appliedFilters.favoriteMember,
              }).toString()}`
            )
          }
          onReset={resetFilters}
          showReset={hasActiveFilters(appliedFilters)}
        />
      ) : (
        <GroupDealCardList
          deals={filtered}
          highlightMember={
            appliedFilters.vacantOnly ? appliedFilters.favoriteMember : undefined
          }
        />
      )}
    </div>
  )
}

export default SearchBrowse
