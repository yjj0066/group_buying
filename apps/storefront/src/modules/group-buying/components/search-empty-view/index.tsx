"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"

import { useDictionary } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import SearchEmptyResults from "@modules/group-buying/components/search-empty-results"
import { BbSearchInput } from "@modules/design-system"

const SearchEmptyView = () => {
  const t = useDictionary()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const searchParams = useSearchParams()
  const query = searchParams.get("q") ?? ""

  return (
    <div className="flex flex-col gap-4 pb-8">
      <BbSearchInput
        placeholder="아이돌·멤버·굿즈 검색"
        defaultValue={query}
        readOnly
      />

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex h-9 items-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-medium text-[#111827]">
          {t.groupBuying.filterIdolGroup} ▾
        </span>
        <span className="inline-flex h-9 items-center rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-medium text-[#111827]">
          {t.groupBuying.filterPriceRange} ▾
        </span>
      </div>

      <SearchEmptyResults
        onWaitlist={() =>
          router.push(
            `${gbAppRoutes.waitlist(countryCode)}?${new URLSearchParams({
              q: query,
            }).toString()}`
          )
        }
        onReset={() => router.push(gbAppRoutes.search(countryCode))}
      />
    </div>
  )
}

export default SearchEmptyView
