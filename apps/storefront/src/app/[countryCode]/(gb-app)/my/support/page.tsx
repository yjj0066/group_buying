/**
 * [MCS0] 고객센터·분쟁
 * Wireframe ID: MCS0 | 도메인: 마이페이지 | 우선순위: P1
 */
import { Suspense } from "react"

import { requireCustomerForGbApp } from "@lib/data/group-deal-pages"
import { resolveCountryCode } from "@lib/util/country-code"
import MyPageBackLink from "@modules/group-buying/components/my-page-back-link"
import MySupportView from "@modules/group-buying/components/my-support-view"

export default async function MySupportPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const resolvedCountryCode = resolveCountryCode(countryCode)

  await requireCustomerForGbApp(resolvedCountryCode)

  return (
    <div className="flex flex-col gap-4 pb-8">
      <MyPageBackLink />
      <Suspense fallback={null}>
        <MySupportView />
      </Suspense>
    </div>
  )
}
