import { Metadata } from "next"
import { Suspense } from "react"

import { listMyParticipations } from "@lib/data/account-group-deals"
import { getServerDictionary } from "@i18n/server"
import { buildParticipationsListLabels } from "@lib/util/participations-list-labels"
import ParticipationsList from "@modules/account/components/participations-list"
import { Text } from "@modules/common/components/ui"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.meta.participationsTitle,
    description: dictionary.account.meta.participationsDescription,
  }
}

export default function ParticipationsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-sm text-ui-fg-subtle">불러오는 중...</div>
      }
    >
      <ParticipationsPageContent />
    </Suspense>
  )
}

async function ParticipationsPageContent() {
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
        stageLabels={dictionary.account.groupBuying.stages}
        labels={buildParticipationsListLabels(t)}
      />
    </div>
  )
}
