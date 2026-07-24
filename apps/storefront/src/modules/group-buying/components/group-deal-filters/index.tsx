"use client"

import { FormEvent } from "react"
import { useParams, useRouter } from "next/navigation"

import {
  DEFAULT_GROUP_DEAL_FILTERS,
  extractGroupDealFacets,
  filterGroupDeals,
  hasActiveFilters,
  type GroupDealFilterFacets,
  type GroupDealFilterState,
} from "@lib/util/group-deal-filters"
import { IDOL_GROUP_SUGGESTIONS } from "@lib/constants/group-buying-catalog"
import { buildStoreSearchPath } from "@lib/util/product-search-navigation"
import { useDictionary } from "@i18n/provider"
import {
  BbButton,
  BbCard,
  BbHighlightBanner,
  BbSearchInput,
} from "@modules/design-system"
import { Label, Text } from "@modules/common/components/ui"
import PriceRangeFilter from "@modules/group-buying/components/price-range-filter"
import type { GroupDeal } from "types/group-deal"

type GroupDealFiltersProps = {
  deals: GroupDeal[]
  filters: GroupDealFilterState
  facets: GroupDealFilterFacets
  onChange: (next: GroupDealFilterState) => void
  onApply?: () => void
  onReset?: () => void
}

const GroupDealFilters = ({
  filters,
  facets,
  onChange,
  onApply,
  onReset,
}: GroupDealFiltersProps) => {
  const t = useDictionary()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const update = (patch: Partial<GroupDealFilterState>) => {
    onChange({ ...filters, ...patch })
  }

  const navigateToStoreSearch = () => {
    router.push(buildStoreSearchPath(countryCode, filters.query))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (onApply) {
      onApply()
      return
    }

    navigateToStoreSearch()
  }

  return (
    <BbCard padding="md" className="h-fit">
      <Text className="text-sm font-black text-[var(--bb-ink)]">
        {t.groupBuying.filtersTitle}
      </Text>

      <form className="mt-3 flex gap-2" onSubmit={handleSubmit}>
        <BbSearchInput
          value={filters.query}
          onChange={(event) => update({ query: event.target.value })}
          onSearch={onApply ?? navigateToStoreSearch}
          placeholder={t.groupBuying.searchPlaceholder}
          className="min-w-0 flex-1"
        />
        <BbButton type="submit" variant="primary" className="shrink-0 px-4">
          {t.groupBuying.searchApply}
        </BbButton>
      </form>

      <div className="mt-5 flex flex-col gap-y-5">
        <div className="flex flex-col gap-y-2">
          <Label>{t.groupBuying.filterIdolGroup}</Label>
          <input
            type="search"
            list="group-deal-idol-group-suggestions"
            value={filters.idolGroup}
            onChange={(event) => update({ idolGroup: event.target.value })}
            placeholder={t.groupBuying.filterIdolGroupSearchPlaceholder}
            className="bb-input h-10 w-full"
          />
          <datalist id="group-deal-idol-group-suggestions">
            {Array.from(
              new Set([...IDOL_GROUP_SUGGESTIONS, ...facets.idolGroups])
            ).map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
        </div>

        <FilterSelect
          label={t.groupBuying.filterMember}
          value={filters.member}
          options={facets.members}
          onChange={(value) => update({ member: value })}
          allLabel={t.groupBuying.filterAll}
        />

        <FilterSelect
          label={t.groupBuying.filterCatalogStatus}
          value={filters.catalogTab}
          options={["in_progress", "closed", "all"]}
          optionLabels={{
            in_progress: t.groupBuying.catalogStatusInProgress,
            closed: t.groupBuying.catalogStatusClosed,
            all: t.groupBuying.catalogStatusAll,
          }}
          onChange={(value) =>
            update({
              catalogTab: value as GroupDealFilterState["catalogTab"],
            })
          }
          allLabel={t.groupBuying.catalogStatusInProgress}
          hideAllOption
        />

        <FilterSelect
          label={t.groupBuying.filterSort}
          value={filters.sortBy}
          options={["deadline", "newest"]}
          optionLabels={{
            deadline: t.groupBuying.sortDeadline,
            newest: t.groupBuying.sortNewest,
          }}
          onChange={(value) =>
            update({ sortBy: value as GroupDealFilterState["sortBy"] })
          }
          allLabel={t.groupBuying.sortDeadline}
          hideAllOption
        />

        <div className="flex flex-col gap-y-2">
          <Label>{t.groupBuying.filterPriceRange}</Label>
          <PriceRangeFilter
            minBound={facets.minPrice}
            maxBound={Math.max(facets.maxPrice, facets.minPrice + 1000)}
            minValue={filters.minPrice}
            maxValue={filters.maxPrice}
            onChange={(next) => update(next)}
          />
        </div>

        <div className="flex flex-col gap-y-3 border-t border-[var(--bb-line)] pt-4">
          {filters.vacantOnly && filters.favoriteMember && (
            <BbHighlightBanner>
              ★ {t.groupBuying.vacantOnlyToggle} · {filters.favoriteMember}
            </BbHighlightBanner>
          )}

          <FilterSelect
            label={t.groupBuying.favoriteMember}
            value={filters.favoriteMember}
            options={facets.members}
            onChange={(value) => update({ favoriteMember: value })}
            allLabel={t.groupBuying.favoriteMemberPlaceholder}
          />

          <label className="flex items-center gap-2 text-sm font-medium text-[var(--bb-ink)]">
            <input
              type="checkbox"
              checked={filters.vacantOnly}
              onChange={(event) => update({ vacantOnly: event.target.checked })}
              className="h-4 w-4 rounded border-[var(--bb-line)] text-brand-purple focus:ring-brand-purple/30"
            />
            {t.groupBuying.vacantOnlyToggle}
          </label>

          <label className="flex items-center gap-2 text-sm font-medium text-[var(--bb-ink)]">
            <input
              type="checkbox"
              checked={filters.urgentOnly}
              onChange={(event) => update({ urgentOnly: event.target.checked })}
              className="h-4 w-4 rounded border-[var(--bb-line)] text-brand-purple focus:ring-brand-purple/30"
            />
            {t.groupBuying.urgentOnlyToggle}
          </label>
        </div>

        {hasActiveFilters(filters) && (
          <BbButton
            type="button"
            variant="secondary"
            fullWidth
            onClick={() =>
              onReset ? onReset() : onChange({ ...DEFAULT_GROUP_DEAL_FILTERS })
            }
          >
            {t.groupBuying.resetFilters}
          </BbButton>
        )}
      </div>
    </BbCard>
  )
}

const FilterSelect = ({
  label,
  value,
  options,
  onChange,
  allLabel,
  optionLabels,
  hideAllOption = false,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  allLabel: string
  optionLabels?: Record<string, string>
  hideAllOption?: boolean
}) => (
  <div className="flex flex-col gap-y-2">
    <Label>{label}</Label>
    <select
      className="bb-input h-10 cursor-pointer appearance-none"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {!hideAllOption && <option value="">{allLabel}</option>}
      {options.map((option) => (
        <option key={option} value={option}>
          {optionLabels?.[option] ?? option}
        </option>
      ))}
    </select>
  </div>
)

export default GroupDealFilters

export { extractGroupDealFacets, filterGroupDeals, DEFAULT_GROUP_DEAL_FILTERS }
