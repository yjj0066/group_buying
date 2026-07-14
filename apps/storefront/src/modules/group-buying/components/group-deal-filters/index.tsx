"use client"

import {
  DEFAULT_GROUP_DEAL_FILTERS,
  extractGroupDealFacets,
  filterGroupDeals,
  type GroupDealFilterFacets,
  type GroupDealFilterState,
} from "@lib/util/group-deal-filters"
import { useDictionary } from "@i18n/provider"
import { Button, Input, Label, Text } from "@modules/common/components/ui"
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

  return (
    <aside className="flex flex-col gap-y-5 rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
      <div>
        <HeadingBlock title={t.groupBuying.filtersTitle} />
        <Input
          value={filters.query}
          onChange={(event) => update({ query: event.target.value })}
          placeholder={t.groupBuying.searchPlaceholder}
          className="mt-2"
        />
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

      <Button
        variant="secondary"
        onClick={() => onChange({ ...DEFAULT_GROUP_DEAL_FILTERS })}
      >
        {t.groupBuying.resetFilters}
      </Button>
    </aside>
  )
}

const HeadingBlock = ({ title }: { title: string }) => (
  <Text className="text-sm font-semibold text-ui-fg-base">{title}</Text>
)

const FilterSelect = ({
  label,
  value,
  options,
  onChange,
  allLabel,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  allLabel: string
}) => (
  <div className="flex flex-col gap-y-2">
    <Label>{label}</Label>
    <select
      className="h-10 rounded-md border border-ui-border-base bg-ui-bg-base px-3 text-sm"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
)

export default GroupDealFilters

export { extractGroupDealFacets, filterGroupDeals, DEFAULT_GROUP_DEAL_FILTERS }
