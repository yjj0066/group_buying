/**
 * [DETL-C] 전 자리 마감
 * Wireframe ID: DETL-C | 도메인: 참여자 | 우선순위: P0 | 상태 화면
 */
import { notFound } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import { loadDealDetailPageData } from "@lib/data/load-deal-detail-page"
import DealDetailView from "@modules/group-buying/components/deal-detail-view"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
}

export default async function DealClosedPage(props: Props) {
  const { countryCode, dealId } = await props.params
  const pageData = await loadDealDetailPageData(countryCode, dealId)

  if (!pageData) {
    notFound()
  }

  const customer = await retrieveCustomer().catch(() => null)

  return (
    <DealDetailView
      deal={pageData.deal}
      heroImageUrl={pageData.heroImageUrl}
      customerEmail={customer?.email ?? null}
      allSeatsClosed
    />
  )
}
