"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  filtersToSearchParams,
  parseFiltersFromSearchParams,
} from "@lib/util/group-deal-filter-url"
import {
  DEFAULT_GROUP_DEAL_FILTERS,
  SEARCH_MIN_LENGTH,
  type GroupDealFilterState,
} from "@lib/util/group-deal-filters"

type UseGroupDealSearchOptions = {
  initialFilters?: GroupDealFilterState
}

export const useGroupDealSearch = ({
  initialFilters,
}: UseGroupDealSearchOptions = {}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchKey = searchParams.toString()

  const preferenceBase = useRef({
    favoriteMember: initialFilters?.favoriteMember ?? "",
    idolGroup: initialFilters?.idolGroup ?? "",
  })

  const parseFromUrl = useCallback(() => {
    return parseFiltersFromSearchParams(searchParams, {
      favoriteMember: preferenceBase.current.favoriteMember,
      idolGroup: preferenceBase.current.idolGroup,
    })
  }, [searchParams])

  const [draftFilters, setDraftFilters] = useState<GroupDealFilterState>(
    () => initialFilters ?? parseFiltersFromSearchParams(new URLSearchParams())
  )
  const [appliedFilters, setAppliedFilters] = useState<GroupDealFilterState>(
    () => initialFilters ?? parseFiltersFromSearchParams(new URLSearchParams())
  )
  const [queryHint, setQueryHint] = useState(false)
  const draftRef = useRef(draftFilters)
  const skipUrlSyncRef = useRef(false)

  draftRef.current = draftFilters

  useEffect(() => {
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false
      return
    }

    const fromUrl = parseFromUrl()
    setDraftFilters(fromUrl)
    setAppliedFilters(fromUrl)
  }, [searchKey, parseFromUrl])

  const applySearch = useCallback(() => {
    const next = { ...draftRef.current }
    const trimmedQuery = next.query.trim()

    if (trimmedQuery.length > 0 && trimmedQuery.length < SEARCH_MIN_LENGTH) {
      setQueryHint(true)
      return
    }

    setQueryHint(false)
    skipUrlSyncRef.current = true
    setAppliedFilters(next)
    setDraftFilters(next)

    const params = filtersToSearchParams(next)
    const queryString = params.toString()
    const target = queryString ? `${pathname}?${queryString}` : pathname

    router.replace(target, { scroll: false })
  }, [pathname, router])

  const resetSearch = useCallback(() => {
    const reset = {
      ...DEFAULT_GROUP_DEAL_FILTERS,
      favoriteMember: preferenceBase.current.favoriteMember,
      idolGroup: preferenceBase.current.idolGroup,
    }

    skipUrlSyncRef.current = true
    setDraftFilters(reset)
    setAppliedFilters(reset)
    setQueryHint(false)
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  return {
    draftFilters,
    setDraftFilters,
    appliedFilters,
    applySearch,
    resetSearch,
    queryHint,
  }
}

export default useGroupDealSearch
