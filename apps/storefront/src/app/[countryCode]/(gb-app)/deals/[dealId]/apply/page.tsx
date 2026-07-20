/**
 * [APLY] 신청·배송정보 입력
 * Wireframe ID: APLY | 도메인: 참여자 | 우선순위: P0
 */
import { notFound, redirect } from "next/navigation"

import { getStoreGroupDeal } from "@lib/data/group-deals"
import { dealRequiresOptionSelection } from "@lib/util/group-deal-options"
import { gbAppRoutes } from "@lib/wireframe/routes"
import DealApplyForm from "@modules/group-buying/components/deal-apply-form"

type Props = {
  params: Promise<{ countryCode: string; dealId: string }>
  searchParams: Promise<{
    optionId?: string
    member?: string
    quantity?: string
  }>
}

export default async function DealApplyPage(props: Props) {
  const { countryCode, dealId } = await props.params
  const { optionId, member, quantity: quantityParam } = await props.searchParams
  const deal = await getStoreGroupDeal(dealId)

  if (!deal) {
    notFound()
  }

  const requiresOption = dealRequiresOptionSelection(deal)

  if (requiresOption && (!optionId || !member)) {
    redirect(gbAppRoutes.deal(countryCode, dealId))
  }

  const parsedQuantity = Number(quantityParam ?? "1")
  const quantity =
    Number.isFinite(parsedQuantity) && parsedQuantity >= 1
      ? Math.floor(parsedQuantity)
      : 1

  return (
    <DealApplyForm
      deal={deal}
      optionId={optionId ?? ""}
      memberLabel={member ?? deal.title}
      quantity={quantity}
    />
  )
}
