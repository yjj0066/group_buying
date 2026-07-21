/**
 * [MYJN] 내 참여 현황 (목록)
 * Wireframe ID: MYJN | 도메인: 참여자 | 우선순위: P0
 */
import { Suspense } from "react"

import { listMyParticipations } from "@lib/data/account-group-deals"
import { getServerDictionary } from "@i18n/server"
import { buildParticipationsListLabels } from "@lib/util/participations-list-labels"
import ParticipationsList from "@modules/account/components/participations-list"
import { BbSectionHeader } from "@modules/design-system"

export default function ParticipationsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-sm text-[var(--bb-mute)]">불러오는 중...</div>
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
  const stageLabels = dictionary.account.groupBuying.stages

  return (
    <div className="flex flex-col gap-6 pb-8">
      <BbSectionHeader title={t.title} subtitle={t.description} />

      <ParticipationsList
        participations={participations}
        stageLabels={stageLabels}
        labels={buildParticipationsListLabels(t)}
      />
    </div>
  )
}
