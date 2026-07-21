/**
 * [MIP0] 내 참여 관리 (참여자용)
 * Wireframe ID: MIP0 (alias MJPT) | 도메인: 마이페이지 | 우선순위: P1
 * Entry: MYP0 마이페이지 → 내 참여 관리 (참여자용)
 */
import { Suspense } from "react"

import { listMyParticipations } from "@lib/data/account-group-deals"
import { requireCustomerForGbApp } from "@lib/data/group-deal-pages"
import { getServerDictionary } from "@i18n/server"
import { resolveCountryCode } from "@lib/util/country-code"
import { buildParticipationsListLabels } from "@lib/util/participations-list-labels"
import ParticipationsList from "@modules/account/components/participations-list"
import MyPageBackLink from "@modules/group-buying/components/my-page-back-link"
import { BbSectionHeader } from "@modules/design-system"

async function MyParticipationsPageContent({
  countryCode,
}: {
  countryCode: string
}) {
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
        labels={buildParticipationsListLabels(t)}
      />
    </div>
  )
}

export default function MyParticipationsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-sm text-[var(--bb-mute)]">불러오는 중...</div>
      }
    >
      <MyParticipationsPageWrapper params={props.params} />
    </Suspense>
  )
}

async function MyParticipationsPageWrapper({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params

  return <MyParticipationsPageContent countryCode={countryCode} />
}
