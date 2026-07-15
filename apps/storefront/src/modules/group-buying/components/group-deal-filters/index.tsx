"use client"

import {
  DEFAULT_GROUP_DEAL_FILTERS,
  extractGroupDealFacets,
  filterGroupDeals,
  hasActiveFilters,
  SEARCH_MIN_LENGTH,
  type GroupDealFilterFacets,
  type GroupDealFilterState,
} from "@lib/util/group-deal-filters"
import { useDictionary } from "@i18n/provider"
import { Button, Input, Label, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { GroupDeal } from "types/group-deal"

type GroupDealFiltersProps = {
  deals: GroupDeal[]
  filters: GroupDealFilterState
  facets: GroupDealFilterFacets
  onChange: (next: GroupDealFilterState) => void
}

const GroupDealFilters = ({
  filters,
  facets,
  onChange,
}: GroupDealFiltersProps) => {
  const t = useDictionary()

  const update = (patch: Partial<GroupDealFilterState>) => {
    onChange({ ...filters, ...patch })
  }

  const queryTooShort =
    filters.query.trim().length > 0 &&
    filters.query.trim().length < SEARCH_MIN_LENGTH

  return (
    <aside className="flex flex-col gap-y-5 rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
      <div>
        <Text className="text-sm font-semibold text-ui-fg-base">
          {t.groupBuying.filtersTitle}
        </Text>
        <Input
          value={filters.query}
          onChange={(event) => update({ query: event.target.value })}
          placeholder={t.groupBuying.searchPlaceholder}
          className="mt-2"
          aria-describedby={queryTooShort ? "search-min-hint" : undefined}
        />
        {queryTooShort && (
          <Text
            id="search-min-hint"
            className="mt-1 text-xs text-amber-600"
          >
            {t.groupBuying.searchMinLengthHint}
          </Text>
        )}
      </div>

      <FilterSelect
        label={t.groupBuying.filterIdolGroup}
        value={filters.idolGroup}
        options={facets.idolGroups}
        onChange={(value) => update({ idolGroup: value })}
        allLabel={t.groupBuying.filterAll}
      />

      <FilterSelect
        label={t.groupBuying.filterMember}
        value={filters.member}
        options={facets.members}
        onChange={(value) => update({ member: value })}
        allLabel={t.groupBuying.filterAll}
      />

      <FilterSelect
        label={t.groupBuying.filterGoodsType}
        value={filters.goodsType}
        options={facets.goodsTypes}
        onChange={(value) => update({ goodsType: value })}
        allLabel={t.groupBuying.filterAll}
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
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={0}
            placeholder={String(facets.minPrice)}
            value={filters.minPrice ?? ""}
            onChange={(event) =>
              update({
                minPrice: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
          />
          <Input
            type="number"
            min={0}
            placeholder={String(facets.maxPrice)}
            value={filters.maxPrice ?? ""}
            onChange={(event) =>
              update({
                maxPrice: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-y-2 border-t border-ui-border-base pt-4">
        <Label>{t.groupBuying.favoriteMember}</Label>
        <select
          className="h-10 rounded-md border border-ui-border-base bg-ui-bg-base px-3 text-sm"
          value={filters.favoriteMember}
          onChange={(event) => update({ favoriteMember: event.target.value })}
        >
          <option value="">{t.groupBuying.favoriteMemberPlaceholder}</option>
          {facets.members.map((member) => (
            <option key={member} value={member}>
              {member}
            </option>
          ))}
        </select>

        <label className="mt-2 flex items-center gap-2 text-sm text-ui-fg-base">
          <input
            type="checkbox"
            checked={filters.vacantOnly}
            onChange={(event) => update({ vacantOnly: event.target.checked })}
            className="h-4 w-4 rounded border-ui-border-base"
          />
          {t.groupBuying.vacantOnlyToggle}
        </label>
      </div>

      {hasActiveFilters(filters) && (
        <Button
          variant="secondary"
          onClick={() => onChange({ ...DEFAULT_GROUP_DEAL_FILTERS })}
        >
          {t.groupBuying.resetFilters}
        </Button>
      )}
    </aside>
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
      className="h-10 rounded-md border border-ui-border-base bg-ui-bg-base px-3 text-sm"
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
