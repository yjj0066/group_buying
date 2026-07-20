/**
 * [CHKO] 입금 안내 (가상계좌)
 * Wireframe ID: CHKO | 도메인: 참여자 | 우선순위: P0
 */
import { notFound, redirect } from "next/navigation"

import { getStoreGroupDeal } from "@lib/data/group-deals"
import { gbAppRoutes } from "@lib/wireframe/routes"
import DealDepositFlow from "@modules/group-buying/components/deal-deposit-flow"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
  searchParams: Promise<{ participantId?: string }>
}

export default async function DealDepositPage(props: Props) {
  const { countryCode, dealId } = await props.params
  const { participantId } = await props.searchParams
  const deal = await getStoreGroupDeal(dealId)

  if (!deal) {
    notFound()
  }

  if (!participantId) {
    redirect(gbAppRoutes.dealApply(countryCode, dealId))
  }

  return <DealDepositFlow deal={deal} participantId={participantId} />
}
