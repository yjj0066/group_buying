/**
 * [MCS0] 1:1 문의
 * Wireframe ID: MCS0-inquiry | 도메인: 마이페이지 | 우선순위: P1
 */
import { Suspense } from "react"

import { listMyParticipations } from "@lib/data/account-group-deals"
import { requireCustomerForGbApp } from "@lib/data/group-deal-pages"
import { resolveCountryCode } from "@lib/util/country-code"
import MyPageBackLink from "@modules/group-buying/components/my-page-back-link"
import MySupportInquiryView from "@modules/group-buying/components/my-support-inquiry-view"

const uniqueDealOptions = (
  participations: Awaited<ReturnType<typeof listMyParticipations>>
) => {
  const seen = new Set<string>()

  return participations
    .filter((participation) => {
      if (seen.has(participation.group_deal.id)) {
        return false
      }

      seen.add(participation.group_deal.id)
      return true
    })
    .map((participation) => ({
      dealId: participation.group_deal.id,
      title: participation.group_deal.title,
    }))
}

export default async function MySupportInquiryPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const resolvedCountryCode = resolveCountryCode(countryCode)

  const [, participations] = await Promise.all([
    requireCustomerForGbApp(resolvedCountryCode),
    listMyParticipations(),
  ])

  const dealOptions = uniqueDealOptions(participations)

  return (
    <div className="flex flex-col gap-4 pb-8">
      <MyPageBackLink />
      <Suspense fallback={null}>
        <MySupportInquiryView
          countryCode={resolvedCountryCode}
          dealOptions={dealOptions}
        />
      </Suspense>
    </div>
  )
}
