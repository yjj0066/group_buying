/**
 * [MAL0] 알림 설정
 * Wireframe ID: MAL0 | 도메인: 마이페이지 | 우선순위: P1
 */
import { retrieveGroupBuyingPreferences } from "@lib/data/account-group-deals"
import { requireCustomerForGbApp } from "@lib/data/group-deal-pages"
import { getServerDictionary } from "@i18n/server"
import { resolveCountryCode } from "@lib/util/country-code"
import MyNotificationsView from "@modules/group-buying/components/my-notifications-view"
import MyPageBackLink from "@modules/group-buying/components/my-page-back-link"
import { BbSectionHeader } from "@modules/design-system"

export default async function MyNotificationsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const resolvedCountryCode = resolveCountryCode(countryCode)

  const [dictionary, , preferences] = await Promise.all([
    getServerDictionary(),
    requireCustomerForGbApp(resolvedCountryCode),
    retrieveGroupBuyingPreferences(),
  ])

  return (
    <div className="flex flex-col gap-4 pb-8">
      <MyPageBackLink />
      <BbSectionHeader
        title={dictionary.account.preferences.notificationsTitle}
        subtitle={dictionary.account.preferences.notificationsDescription}
      />
      <MyNotificationsView initialPreferences={preferences} />
    </div>
  )
}
