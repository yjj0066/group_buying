/**
 * [SRCH-E] 검색 결과 없음
 * Wireframe ID: SRCH-E | 도메인: 참여자 | 우선순위: P0 | 상태 화면
 */
import { Suspense } from "react"

import SearchEmptyView from "@modules/group-buying/components/search-empty-view"

export default function SearchEmptyPage() {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-sm text-[var(--bb-mute)]">불러오는 중...</div>
      }
    >
      <SearchEmptyView />
    </Suspense>
  )
}

