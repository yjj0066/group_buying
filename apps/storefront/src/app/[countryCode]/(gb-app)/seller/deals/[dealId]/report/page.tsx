/**
 * [RPTG] 공구 리포트 (총대)
 * Wireframe ID: RPTG | 도메인: 총대 | 우선순위: P0
 */
import { notFound } from "next/navigation"

import { getHostedGroupDeal } from "@lib/data/account-group-deals"
import {
  getLeaderGroupDealForPage,
  requireCustomerForGbApp,
} from "@lib/data/group-deal-pages"
import { listHostedDealParticipations } from "@lib/data/leader-deal-participations"
import { getServerDictionary } from "@i18n/server"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { resolveCountryCode } from "@lib/util/country-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SellerLeaderReportView from "@modules/group-buying/components/seller-leader-report-view"
import { BbButton } from "@modules/design-system"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
}

export default async function SellerReportPage(props: Props) {
  const { countryCode, dealId } = await props.params
  const resolvedCountryCode = resolveCountryCode(countryCode)

  const [dictionary, , accountDeal, groupDeal] = await Promise.all([
    getServerDictionary(),
    requireCustomerForGbApp(resolvedCountryCode),
    getHostedGroupDeal(dealId),
    getLeaderGroupDealForPage(dealId),
  ])

  if (!accountDeal || !groupDeal) {
    notFound()
  }

  const participations = await listHostedDealParticipations(
    dealId,
    groupDeal.deal_price
  )

  return (
    <div className="flex flex-col gap-4 pb-8">
      <LocalizedClientLink href={gbAppRoutes.sellerDeal(resolvedCountryCode, dealId)}>
        <BbButton variant="secondary" size="sm">
          {dictionary.account.hostedDeals.report.backToList}
        </BbButton>
      </LocalizedClientLink>

      <SellerLeaderReportView
        deal={accountDeal}
        groupDeal={groupDeal}
        participations={participations}
      />
    </div>
  )
}
