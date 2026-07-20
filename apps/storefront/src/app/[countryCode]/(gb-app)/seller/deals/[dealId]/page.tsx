/**

 * [DASH] 총대 대시보드 (Step 3)

 * Wireframe ID: DASH | 도메인: 총대 | 우선순위: P0

 */

import {

  listHostedDealParticipations,

} from "@lib/data/account-group-deals"

import {

  getLeaderGroupDealForPage,

  requireCustomerForGbApp,

} from "@lib/data/group-deal-pages"

import { resolveCountryCode } from "@lib/util/country-code"

import { mapParticipationToHostedDealParticipant } from "@lib/util/seller-deal-dashboard-data"

import SellerDealDashboardPageContent from "@modules/group-buying/components/seller-deal-dashboard/seller-deal-dashboard-page-content"



type Props = {

  params: Promise<{ countryCode: string; dealId: string }>

}



export default async function SellerDashboardPage(props: Props) {

  const { countryCode, dealId } = await props.params

  const resolvedCountryCode = resolveCountryCode(countryCode)



  await requireCustomerForGbApp(resolvedCountryCode)



  const deal = await getLeaderGroupDealForPage(dealId)



  const participations = deal

    ? await listHostedDealParticipations(dealId)

    : []



  const participants = deal

    ? participations.map((participation) =>

        mapParticipationToHostedDealParticipant(participation, deal)

      )

    : []



  return (

    <SellerDealDashboardPageContent

      dealId={dealId}

      initialDeal={deal}

      initialParticipants={participants}

    />

  )

}


