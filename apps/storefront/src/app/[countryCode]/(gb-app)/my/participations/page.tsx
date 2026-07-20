/**
 * [MIP0] 내 참여 관리 (참여자용)
 * Wireframe ID: MIP0 (alias MJPT) | 도메인: 마이페이지 | 우선순위: P1
 * Entry: MYP0 마이페이지 → 내 참여 관리 (참여자용)
 */
import { listMyParticipations } from "@lib/data/account-group-deals"
import { requireCustomerForGbApp } from "@lib/data/group-deal-pages"
import { getServerDictionary } from "@i18n/server"
import { resolveCountryCode } from "@lib/util/country-code"
import ParticipationsList from "@modules/account/components/participations-list"
import MyPageBackLink from "@modules/group-buying/components/my-page-back-link"
import { BbSectionHeader } from "@modules/design-system"

export default async function MyParticipationsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const resolvedCountryCode = resolveCountryCode(countryCode)

  const [dictionary, , participations] = await Promise.all([
    getServerDictionary(),
    requireCustomerForGbApp(resolvedCountryCode),
    listMyParticipations(),
  ])

  const t = dictionary.account.participations
  const stageLabels = dictionary.account.groupBuying.stages

  return (
    <div className="flex flex-col gap-6 pb-8">
      <MyPageBackLink />
      <BbSectionHeader title={t.title} subtitle={t.description} />
      <ParticipationsList
        participations={participations}
        stageLabels={stageLabels}
        labels={{
          tabActive: t.tabActive,
          tabCompleted: t.tabCompleted,
          tabCancelled: t.tabCancelled,
          empty: t.empty,
          emptyActive: t.emptyActive,
          emptyActiveCta: t.emptyActiveCta,
          emptyCompleted: t.emptyCompleted,
          emptyCancelled: t.emptyCancelled,
          autoDeliveryConfirmHint: t.autoDeliveryConfirmHint,
          deliveryConfirmNeededAlert: t.deliveryConfirmNeededAlert,
          quantity: t.quantity,
          viewDeal: t.viewDeal,
          viewDetail: t.viewDetail,
          memberLabel: t.memberLabel,
          memberFallback: t.memberFallback,
          statusCancelled: t.statusCancelled,
          statusRefunded: t.statusRefunded,
          tracking: t.tracking,
          confirmDelivery: t.confirmDelivery,
          confirmingDelivery: t.confirmingDelivery,
          deliveryConfirmed: t.deliveryConfirmed,
          confirmDeliveryError: t.confirmDeliveryError,
          confirmPurchase: t.confirmPurchase,
          confirmPurchaseTitle: t.confirmPurchaseTitle,
          confirmPurchaseMessage: t.confirmPurchaseMessage,
          confirmPurchaseConfirm: t.confirmPurchaseConfirm,
          confirmPurchaseCancel: t.confirmPurchaseCancel,
          progressStages: t.progressStages,
        }}
      />
    </div>
  )
}
