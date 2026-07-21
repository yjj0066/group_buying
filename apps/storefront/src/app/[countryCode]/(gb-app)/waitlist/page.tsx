/**
 * [ALRT] 자리 알림 대기등록 (팝업)
 * Wireframe ID: ALRT | 도메인: 참여자 | 우선순위: P0
 */
import { Suspense } from "react"

import { getStoreGroupDeal } from "@lib/data/group-deals"
import { retrieveCustomer } from "@lib/data/customer"
import WaitlistForm from "@modules/group-buying/components/waitlist-form"

type Props = {
  searchParams: Promise<{
    dealId?: string
    member?: string
    optionId?: string
  }>
}

async function WaitlistPageContent({
  searchParams,
}: {
  searchParams: Props["searchParams"]
}) {
  const params = await searchParams
  const dealId = params.dealId
  const deal = dealId ? await getStoreGroupDeal(dealId) : null
  const customer = await retrieveCustomer().catch(() => null)

  return (
    <WaitlistForm
      deal={deal}
      initialMember={params.member ?? ""}
      initialOptionId={params.optionId ?? ""}
      initialEmail={customer?.email ?? null}
    />
  )
}

export default function WaitlistPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-sm text-[var(--bb-mute)]">불러오는 중...</div>
      }
    >
      <WaitlistPageContent searchParams={props.searchParams} />
    </Suspense>
  )
}
