import { Metadata } from "next"

import { listMyParticipations } from "@lib/data/account-group-deals"
import { getServerDictionary } from "@i18n/server"
import ParticipationsList from "@modules/account/components/participations-list"
import { Text } from "@modules/common/components/ui"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.meta.participationsTitle,
    description: dictionary.account.meta.participationsDescription,
  }
}

export default async function ParticipationsPage() {
  const [dictionary, participations] = await Promise.all([
    getServerDictionary(),
    listMyParticipations(),
  ])

  const t = dictionary.account.participations

  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h1 className="text-2xl-semi">{t.title}</h1>
        <Text className="mt-2 text-ui-fg-subtle">{t.description}</Text>
      </div>
      <ParticipationsList
        participations={participations}
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
          quantity: t.quantity,
          viewDeal: t.viewDeal,
          viewDetail: t.viewDetail,
          tracking: t.tracking,
          confirmDelivery: t.confirmDelivery,
          confirmingDelivery: t.confirmingDelivery,
          deliveryConfirmed: t.deliveryConfirmed,
          confirmDeliveryError: t.confirmDeliveryError,
        }}
      />
    </div>
  )
}
