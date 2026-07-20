"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import {
  GOODS_TYPE_OPTIONS,
  IDOL_GROUP_SUGGESTIONS,
} from "@lib/constants/group-buying-catalog"
import type {
  GroupDealFilterFacets,
  GroupDealFilterState,
} from "@lib/util/group-deal-filters"
import { useDictionary } from "@i18n/provider"
import { BbButton } from "@modules/design-system"
import PriceRangeFilter from "@modules/group-buying/components/price-range-filter"

type FilterKey = "idolGroup" | "goodsType" | "priceRange"

type SearchFilterBarProps = {
  filters: GroupDealFilterState
  facets: GroupDealFilterFacets
  onChange: (patch: Partial<GroupDealFilterState>) => void
}

const formatPriceLabel = (value: number) =>
  new Intl.NumberFormat("ko-KR").format(value)

export const SearchFilterBar = ({
  filters,
  facets,
  onChange,
}: SearchFilterBarProps) => {
  const t = useDictionary().groupBuying
  const containerRef = useRef<HTMLDivElement>(null)
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null)
  const [idolDraft, setIdolDraft] = useState(filters.idolGroup)

  const priceFloor = facets.minPrice
  const priceCeiling = Math.max(facets.maxPrice, priceFloor + 1000)

  useEffect(() => {
    setIdolDraft(filters.idolGroup)
  }, [filters.idolGroup])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenFilter(null)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)

    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  const idolSuggestions = useMemo(() => {
    const merged = new Set<string>([
      ...IDOL_GROUP_SUGGESTIONS,
      ...facets.idolGroups,
    ])
    const query = idolDraft.trim().toLowerCase()

    return Array.from(merged)
      .filter((group) => !query || group.toLowerCase().includes(query))
      .sort((a, b) => a.localeCompare(b, "ko"))
  }, [facets.idolGroups, idolDraft])

  const toggleFilter = (key: FilterKey) => {
    setOpenFilter((current) => (current === key ? null : key))
  }

  const applyIdolGroup = (value: string) => {
    onChange({ idolGroup: value.trim() })
    setIdolDraft(value.trim())
    setOpenFilter(null)
  }

  const clearIdolGroup = () => {
    onChange({ idolGroup: "" })
    setIdolDraft("")
    setOpenFilter(null)
  }

  const getPillLabel = (key: FilterKey) => {
    if (key === "idolGroup") {
      return filters.idolGroup || t.filterIdolGroup
    }

    if (key === "goodsType") {
      return filters.goodsType || t.filterGoodsType
    }

    if (filters.minPrice != null || filters.maxPrice != null) {
      const min = filters.minPrice ?? priceFloor
      const max = filters.maxPrice ?? priceCeiling

      return `${formatPriceLabel(min)}~${formatPriceLabel(max)}원`
    }

    return t.filterPriceRange
  }

  const isActive = (key: FilterKey) => {
    if (key === "idolGroup") {
      return Boolean(filters.idolGroup)
    }

    if (key === "goodsType") {
      return Boolean(filters.goodsType)
    }

    return filters.minPrice != null || filters.maxPrice != null
  }

  const filterKeys: FilterKey[] = ["idolGroup", "goodsType", "priceRange"]

  return (
    <div ref={containerRef} className="relative flex flex-wrap gap-2">
      {filterKeys.map((key) => (
        <div key={key} className="relative">
          <button
            type="button"
            onClick={() => toggleFilter(key)}
            className={`inline-flex h-9 min-w-[88px] items-center justify-center rounded-full border px-3 text-xs font-medium transition-colors ${
              isActive(key) || openFilter === key
                ? "border-[#6B46E5]/30 bg-[#F5F3FF] text-[#6B46E5]"
                : "border-[#E5E7EB] bg-white text-[#4B5563] hover:border-[#D1D5DB]"
            }`}
            data-testid={`search-filter-${key}`}
          >
            {getPillLabel(key)} ▾
          </button>

          {openFilter === key && (
            <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-[min(100vw-2rem,280px)] rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-lg">
              {key === "idolGroup" && (
                <div className="flex flex-col gap-2">
                  <input
                    type="search"
                    value={idolDraft}
                    onChange={(event) => {
                      const value = event.target.value
                      setIdolDraft(value)
                      onChange({ idolGroup: value.trim() })
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        applyIdolGroup(idolDraft)
                      }
                    }}
                    placeholder={t.filterIdolGroupSearchPlaceholder}
                    className="bb-input h-10 w-full"
                    autoFocus
                    data-testid="search-filter-idol-input"
                  />

                  <div className="max-h-40 overflow-y-auto rounded-lg border border-[#F3F4F6]">
                    {idolSuggestions.length ? (
                      idolSuggestions.map((group) => (
                        <button
                          key={group}
                          type="button"
                          onClick={() => applyIdolGroup(group)}
                          className="flex w-full px-3 py-2 text-left text-sm text-[#374151] hover:bg-[#F9FAFB]"
                        >
                          {group}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-xs text-[#9CA3AF]">
                        {t.filterIdolGroupEmpty}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <BbButton
                      type="button"
                      variant="secondary"
                      fullWidth
                      onClick={clearIdolGroup}
                    >
                      {t.filterClear}
                    </BbButton>
                    <BbButton
                      type="button"
                      variant="primary"
                      fullWidth
                      onClick={() => applyIdolGroup(idolDraft)}
                    >
                      {t.filterApply}
                    </BbButton>
                  </div>
                </div>
              )}

              {key === "goodsType" && (
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ goodsType: "" })
                      setOpenFilter(null)
                    }}
                    className={`rounded-lg px-3 py-2 text-left text-sm ${
                      !filters.goodsType
                        ? "bg-[#F5F3FF] font-semibold text-[#6B46E5]"
                        : "text-[#374151] hover:bg-[#F9FAFB]"
                    }`}
                  >
                    {t.filterAll}
                  </button>
                  {GOODS_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        onChange({ goodsType: option })
                        setOpenFilter(null)
                      }}
                      className={`rounded-lg px-3 py-2 text-left text-sm ${
                        filters.goodsType === option
                          ? "bg-[#F5F3FF] font-semibold text-[#6B46E5]"
                          : "text-[#374151] hover:bg-[#F9FAFB]"
                      }`}
                      data-testid={`search-filter-goods-${option}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {key === "priceRange" && (
                <div className="flex flex-col gap-3">
                  <PriceRangeFilter
                    minBound={priceFloor}
                    maxBound={priceCeiling}
                    minValue={filters.minPrice}
                    maxValue={filters.maxPrice}
                    onChange={(next) => onChange(next)}
                  />
                  <BbButton
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      onChange({ minPrice: null, maxPrice: null })
                      setOpenFilter(null)
                    }}
                  >
                    {t.filterClear}
                  </BbButton>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default SearchFilterBar
