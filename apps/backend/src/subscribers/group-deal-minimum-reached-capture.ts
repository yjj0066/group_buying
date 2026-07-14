import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { captureGroupDealPaymentsWorkflow } from "../workflows/group-deal-billing"
import { GROUP_BUYING_MODULE } from "../modules/group-buying"
import GroupBuyingModuleService from "../modules/group-buying/service"
import { GroupDealStatus } from "../types/group-buying"

type GroupDealUpdatedEventData = {
  id: string
}

/**
 * 공동구매가 minimum_reached 또는 closed 상태가 되면
 * 예약된 빌링키로 일괄 캡처를 시도합니다.
 */
export default async function groupDealMinimumReachedCaptureHandler({
  event,
  container,
}: SubscriberArgs<GroupDealUpdatedEventData>) {
  const groupDealId = event.data?.id

  if (!groupDealId) {
    return
  }

  const groupBuyingService: GroupBuyingModuleService =
    container.resolve(GROUP_BUYING_MODULE)

  const groupDeal = await groupBuyingService.retrieveGroupDeal(groupDealId)

  if (
    groupDeal.status !== GroupDealStatus.MINIMUM_REACHED &&
    groupDeal.status !== GroupDealStatus.CLOSED
  ) {
    return
  }

  const reservedParticipants =
    await groupBuyingService.listReservedParticipants(groupDealId)

  if (!reservedParticipants.length) {
    return
  }

  await captureGroupDealPaymentsWorkflow(container).run({
    input: {
      group_deal_id: groupDealId,
    },
  })
}

export const config: SubscriberConfig = {
  event: "group_deal.updated",
  context: {
    subscriberId: "group-deal-minimum-reached-capture-handler",
  },
}
