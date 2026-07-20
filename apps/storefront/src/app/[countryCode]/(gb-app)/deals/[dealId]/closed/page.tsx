/**
 * [DETL-C] 전 자리 마감
 * Wireframe ID: DETL-C | 도메인: 참여자 | 우선순위: P0 | 상태 화면
 */
import { notFound } from "next/navigation"

import { getStoreGroupDeal } from "@lib/data/group-deals"
import DealClosedView from "@modules/group-buying/components/deal-closed-view"

type Props = {
  params: Promise<{ dealId: string }>
}

export default async function DealClosedPage(props: Props) {
  const { dealId } = await props.params
  const deal = await getStoreGroupDeal(dealId)

  if (!deal) {
    notFound()
  }

  return <DealClosedView deal={deal} />
}
