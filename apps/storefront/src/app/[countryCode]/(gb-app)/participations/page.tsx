/**
 * [MYJN] 내 참여 현황 (목록)
 * Wireframe ID: MYJN | 도메인: 참여자 | 우선순위: P0
 */
import { listMyParticipations } from "@lib/data/account-group-deals"
import { getServerDictionary } from "@i18n/server"
import ParticipationsList from "@modules/account/components/participations-list"
import { BbSectionHeader } from "@modules/design-system"

export default async function ParticipationsPage() {
  const [dictionary, participations] = await Promise.all([
    getServerDictionary(),
    listMyParticipations(),
  ])

  const t = dictionary.account.participations
  const stageLabels = dictionary.account.groupBuying.stages

  return (
    <div className="flex flex-col gap-6 pb-8">
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
