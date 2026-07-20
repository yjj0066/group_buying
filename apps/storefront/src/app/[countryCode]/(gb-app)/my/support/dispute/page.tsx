/**
 * [MCS0] 분쟁 신고
 * Wireframe ID: MCS0-dispute | 도메인: 마이페이지 | 우선순위: P1
 */
import { Suspense } from "react"

import { listMyParticipations } from "@lib/data/account-group-deals"
import { requireCustomerForGbApp } from "@lib/data/group-deal-pages"
import { getMockSettlements } from "@lib/data/mock-settlements"
import { resolveCountryCode } from "@lib/util/country-code"
import MyPageBackLink from "@modules/group-buying/components/my-page-back-link"
import MySupportDisputeView from "@modules/group-buying/components/my-support-dispute-view"

type SearchParams = Promise<{
  dealId?: string
  transactionId?: string
  participantId?: string
  type?: string
}>

const buildDealOptions = (
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
      participantId: participation.participant_id,
    }))
}

export default async function MySupportDisputePage(props: {
  params: Promise<{ countryCode: string }>
  searchParams: SearchParams
}) {
  const { countryCode } = await props.params
  const searchParams = await props.searchParams
  const resolvedCountryCode = resolveCountryCode(countryCode)

  const [, participations] = await Promise.all([
    requireCustomerForGbApp(resolvedCountryCode),
    listMyParticipations(),
  ])

  let prefilledDealId = searchParams.dealId ?? null
  const prefilledTransactionId = searchParams.transactionId ?? null

  if (!prefilledDealId && prefilledTransactionId) {
    const settlement = getMockSettlements().find(
      (record) => record.id === prefilledTransactionId
    )
    prefilledDealId = settlement?.group_deal_id ?? null
  }

  const dealOptions = buildDealOptions(participations)

  if (
    prefilledDealId &&
    !dealOptions.some((option) => option.dealId === prefilledDealId)
  ) {
    const settlement = getMockSettlements().find(
      (record) => record.group_deal_id === prefilledDealId
    )

    dealOptions.unshift({
      dealId: prefilledDealId,
      title: settlement?.group_deal_title ?? prefilledDealId,
      participantId: searchParams.participantId ?? null,
    })
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <MyPageBackLink />
      <Suspense fallback={null}>
        <MySupportDisputeView
          countryCode={resolvedCountryCode}
          dealOptions={dealOptions}
          prefilledDealId={prefilledDealId}
          prefilledTransactionId={prefilledTransactionId}
        />
      </Suspense>
    </div>
  )
}
