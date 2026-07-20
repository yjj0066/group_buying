/**
 * [MBTL] 정산·환불 내역
 * Wireframe ID: MBTL | 도메인: 마이페이지 | 우선순위: P1
 */
import { listMySettlements } from "@lib/data/account-group-deals"
import { requireCustomerForGbApp } from "@lib/data/group-deal-pages"
import { getServerDictionary } from "@i18n/server"
import { resolveCountryCode } from "@lib/util/country-code"
import MyPageBackLink from "@modules/group-buying/components/my-page-back-link"
import MySettlementsView from "@modules/group-buying/components/my-settlements-view"

export default async function MySettlementsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const resolvedCountryCode = resolveCountryCode(countryCode)

  const [dictionary, , settlements] = await Promise.all([
    getServerDictionary(),
    requireCustomerForGbApp(resolvedCountryCode),
    listMySettlements(),
  ])

  const t = dictionary.account.settlements

  return (
    <div className="flex flex-col gap-4 pb-8">
      <MyPageBackLink />
      <MySettlementsView
        countryCode={resolvedCountryCode}
        settlements={settlements}
        labels={{
          title: t.title,
          description: t.description,
          empty: t.empty,
          columns: t.columnsMbtl,
          typeSettlement: t.typeSettlement,
          typeRefund: t.typeRefund,
          typeUnallocatedRefund: t.typeUnallocatedRefund,
          typeDepositReturn: t.typeDepositReturn,
          typeDepositForfeiture: t.typeDepositForfeiture,
          forfeitureHint: t.forfeitureHint,
          forfeitureDialog: t.forfeitureDialog,
        }}
      />
    </div>
  )
}
