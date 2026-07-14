import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { OrderWorkflowEvents } from "@medusajs/framework/utils"
import { confirmGroupDealParticipationWorkflow } from "../workflows/group-deals"

type OrderPlacedEventData = {
  id: string
}

export default async function orderPlacedGroupDealHandler({
  event,
  container,
}: SubscriberArgs<OrderPlacedEventData>) {
  const orderId = event.data?.id

  if (!orderId) {
    return
  }

  await confirmGroupDealParticipationWorkflow(container).run({
    input: {
      order_id: orderId,
    },
  })
}

export const config: SubscriberConfig = {
  event: OrderWorkflowEvents.PLACED,
  context: {
    subscriberId: "order-placed-group-deal-handler",
  },
}
