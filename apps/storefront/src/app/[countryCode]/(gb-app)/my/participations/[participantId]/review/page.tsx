/**
 * [RPTB] 후기 작성
 * Wireframe ID: RPTB | 도메인: 참여자 | 우선순위: P0
 */
import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getMyParticipation } from "@lib/data/account-group-deals"
import { requireCustomerForGbApp } from "@lib/data/group-deal-pages"
import { getServerDictionary } from "@i18n/server"
import { resolveCountryCode } from "@lib/util/country-code"
import { isDeliveryCompleteStatus } from "@lib/util/participation-status"
import { gbAppRoutes } from "@lib/wireframe/routes"
import ParticipantReviewForm from "@modules/group-buying/components/participant-review-form"
import { BbButton, BbSectionHeader } from "@modules/design-system"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Props = {
  params: Promise<{ countryCode: string; participantId: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.participations.reviewPageTitle,
  }
}

export default async function MyParticipationReviewPage(props: Props) {
  const { countryCode, participantId } = await props.params
  const resolvedCountryCode = resolveCountryCode(countryCode)

  const [, participation] = await Promise.all([
    requireCustomerForGbApp(resolvedCountryCode),
    getMyParticipation(participantId),
  ])

  if (!participation || !isDeliveryCompleteStatus(participation)) {
    notFound()
  }

  const dictionary = await getServerDictionary()
  const t = dictionary.account.participations

  return (
    <div className="flex flex-col gap-4">
      <LocalizedClientLink
        href={gbAppRoutes.participationDetail(resolvedCountryCode, participantId)}
      >
        <BbButton variant="secondary" size="sm">
          {t.backToList}
        </BbButton>
      </LocalizedClientLink>

      <BbSectionHeader
        title={t.reviewPageTitle}
        subtitle={t.reviewDescriptionRptb}
      />

      <ParticipantReviewForm
        participation={participation}
        countryCode={resolvedCountryCode}
      />
    </div>
  )
}
