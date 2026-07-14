import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { OrderWorkflowEvents } from "@medusajs/framework/utils"

import { confirmGroupDealParticipationWorkflow } from "../workflows/group-deals"

export default async function confirmGroupDealParticipationHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = event.data?.id

  if (!orderId) {
    return
  }

  await confirmGroupDealParticipationWorkflow(container).run({
    input: { order_id: orderId },
  })
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
  context: {
    subscriberId: "confirm-group-deal-participation",
  },
}
