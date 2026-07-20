/**
 * [CHKO-X] 입금 기한 만료
 * Wireframe ID: CHKO-X | 도메인: 참여자 | 우선순위: P0 | 상태 화면
 */
import { notFound } from "next/navigation"

import { getStoreGroupDeal } from "@lib/data/group-deals"
import DealDepositExpiredView from "@modules/group-buying/components/deal-deposit-expired-view"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
}

export default async function DealDepositExpiredPage(props: Props) {
  const { countryCode, dealId } = await props.params
  const deal = await getStoreGroupDeal(dealId)

  if (!deal) {
    notFound()
  }

  return (
    <DealDepositExpiredView
      countryCode={countryCode}
      dealId={dealId}
      dealTitle={deal.title}
    />
  )
}
