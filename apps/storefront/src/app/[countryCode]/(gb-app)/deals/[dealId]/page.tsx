/**

 * [DETL] 공구 상세

 * Wireframe ID: DETL | 도메인: 참여자 | 우선순위: P0

 */

import { notFound, redirect } from "next/navigation"



import { retrieveCustomer } from "@lib/data/customer"

import { loadDealDetailPageData } from "@lib/data/load-deal-detail-page"

import { gbAppRoutes } from "@lib/wireframe/routes"

import DealDetailView from "@modules/group-buying/components/deal-detail-view"

import { isDealSoldOut } from "types/group-deal"



type Props = {

  params: Promise<{ countryCode: string; dealId: string }>

}



export default async function DealDetailPage(props: Props) {

  const { countryCode, dealId } = await props.params

  const pageData = await loadDealDetailPageData(countryCode, dealId)



  if (!pageData) {

    notFound()

  }



  if (isDealSoldOut(pageData.deal)) {

    redirect(gbAppRoutes.dealClosed(countryCode, dealId))

  }



  const customer = await retrieveCustomer().catch(() => null)



  return (

    <DealDetailView

      deal={pageData.deal}

      heroImageUrl={pageData.heroImageUrl}

      customerEmail={customer?.email ?? null}

    />

  )

}

