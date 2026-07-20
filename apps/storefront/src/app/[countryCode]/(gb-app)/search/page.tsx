/**

 * [SRCH] 빈자리 검색

 * Wireframe ID: SRCH | 도메인: 참여자 | 우선순위: P0

 */

import { Suspense } from "react"



import { retrieveGroupBuyingPreferences } from "@lib/data/account-group-deals"

import { listMockGroupDeals } from "@lib/data/group-deals"

import SearchBrowse from "@modules/group-buying/components/search-browse"



export default async function SearchPage() {

  const [deals, preferences] = await Promise.all([

    listMockGroupDeals(),

    retrieveGroupBuyingPreferences().catch(() => null),

  ])



  return (

    <Suspense

      fallback={

        <div className="py-8 text-sm text-[var(--bb-mute)]">불러오는 중...</div>

      }

    >

      <SearchBrowse deals={deals} initialPreferences={preferences} />

    </Suspense>

  )

}

