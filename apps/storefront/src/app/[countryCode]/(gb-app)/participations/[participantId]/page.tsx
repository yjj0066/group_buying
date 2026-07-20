/**
 * [MYJN-D] 내 참여 현황 (상세)
 * Wireframe ID: MYJN-D | 도메인: 참여자 | 우선순위: P0
 */
import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getMyParticipation } from "@lib/data/account-group-deals"
import { getServerDictionary } from "@i18n/server"
import ParticipationDetailView from "@modules/group-buying/components/participation-detail-view"

type Props = {
  params: Promise<{ countryCode: string; participantId: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.participations.detailTitle,
  }
}

export default async function ParticipationDetailPage(props: Props) {
  const { participantId } = await props.params
  const participation = await getMyParticipation(participantId)

  if (!participation) {
    notFound()
  }

  return <ParticipationDetailView participation={participation} />
}
