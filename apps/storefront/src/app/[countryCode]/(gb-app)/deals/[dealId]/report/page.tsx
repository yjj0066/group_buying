/**

 * [RPTB] 공구 리포트 (참여자)

 * Wireframe ID: RPTB | 도메인: 참여자 | 우선순위: P0

 */

import { notFound } from "next/navigation"



import { getParticipationForDeal } from "@lib/data/account-group-deals"

import { getServerDictionary } from "@i18n/server"

import { gbAppRoutes } from "@lib/wireframe/routes"

import ParticipantReportView from "@modules/group-buying/components/participant-report-view"

import { BbButton } from "@modules/design-system"

import LocalizedClientLink from "@modules/common/components/localized-client-link"



type Props = {

  params: Promise<{ countryCode: string; dealId: string }>

}



export default async function DealReportPage(props: Props) {

  const { countryCode, dealId } = await props.params

  const [dictionary, participation] = await Promise.all([

    getServerDictionary(),

    getParticipationForDeal(dealId),

  ])



  if (!participation) {

    notFound()

  }



  return (

    <div className="flex flex-col gap-4">

      <LocalizedClientLink href={gbAppRoutes.participations(countryCode)}>

        <BbButton variant="secondary" size="sm">

          {dictionary.account.participations.backToList}

        </BbButton>

      </LocalizedClientLink>



      <ParticipantReportView participation={participation} />

    </div>

  )

}

