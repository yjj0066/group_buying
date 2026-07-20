/**
 * [DONE] 신청 완료
 * Wireframe ID: DONE | 도메인: 참여자 | 우선순위: P0
 */
import { notFound, redirect } from "next/navigation"

import {
  getParticipationById,
  getParticipationForDeal,
} from "@lib/data/account-group-deals"
import { getStoreGroupDeal } from "@lib/data/group-deals"
import { gbAppRoutes } from "@lib/wireframe/routes"
import DealCompleteView from "@modules/group-buying/components/deal-complete-view"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
  searchParams: Promise<{
    participantId?: string
    confirmed?: string
  }>
}

export default async function DealCompletePage(props: Props) {
  const { countryCode, dealId } = await props.params
  const { participantId, confirmed } = await props.searchParams

  const deal = await getStoreGroupDeal(dealId)

  if (!deal) {
    notFound()
  }

  const participation = participantId
    ? await getParticipationById(participantId)
    : await getParticipationForDeal(dealId)

  if (!participation && !participantId) {
    redirect(gbAppRoutes.participations(countryCode))
  }

  return (
    <DealCompleteView
      deal={deal}
      participation={participation}
      participantId={participantId ?? participation?.participant_id}
      depositConfirmed={confirmed === "1"}
    />
  )
}
