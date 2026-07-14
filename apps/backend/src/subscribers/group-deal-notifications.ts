import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { GROUP_BUYING_MODULE } from "../modules/group-buying"
import GroupBuyingModuleService from "../modules/group-buying/service"
import { readGroupBuyingPreferences } from "../utils/group-deal-account"

type NotificationPayload = {
  type: "vacancy" | "progress" | "waitlist_matched"
  email: string
  group_deal_id: string
  title: string
  message: string
}

const appendNotificationLog = async (
  container: SubscriberArgs["container"],
  email: string,
  entry: NotificationPayload
) => {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "customer",
      fields: ["id", "email", "metadata"],
      filters: { email },
    })

    const customer = data?.[0] as Record<string, unknown> | undefined

    if (!customer?.id) {
      return
    }

    const metadata =
      (customer.metadata as Record<string, unknown> | null) ?? {}
    const existing = Array.isArray(metadata.notification_log)
      ? metadata.notification_log
      : []

    const customerModule = container.resolve(Modules.CUSTOMER)

    await customerModule.updateCustomers(String(customer.id), {
      metadata: {
        ...metadata,
        notification_log: [
          {
            ...entry,
            sent_at: new Date().toISOString(),
          },
          ...existing,
        ].slice(0, 50),
      },
    })
  } catch {
    // Non-blocking when customer lookup fails.
  }
}

export default async function groupDealNotificationsHandler({
  event,
  container,
}: SubscriberArgs<Record<string, unknown>>) {
  const eventName = event.name
  const data = event.data ?? {}

  if (eventName === "group_deal.waitlist_matched") {
    const email = String(data.email ?? "")
    const groupDealId = String(data.group_deal_id ?? "")

    if (!email || !groupDealId) {
      return
    }

    const payload: NotificationPayload = {
      type: "waitlist_matched",
      email,
      group_deal_id: groupDealId,
      title: "공동구매 빈자리 알림",
      message:
        "대기 중이던 공동구매에 자리가 배정되었습니다. 입금 기한 내 결제를 완료해 주세요.",
    }

    await appendNotificationLog(container, email, payload)

    if (process.env.NODE_ENV === "development") {
      console.info("[group-deal-notification]", payload)
    }

    return
  }

  if (eventName === "group_deal.updated") {
    const groupDealId = String(data.id ?? data.group_deal_id ?? "")

    if (!groupDealId) {
      return
    }

    const groupBuyingService: GroupBuyingModuleService = container.resolve(
      GROUP_BUYING_MODULE
    )

    const deal = await groupBuyingService.retrieveGroupDeal(groupDealId)
    const participants = await groupBuyingService.listGroupDealParticipants({
      group_deal_id: groupDealId,
      status: ["reserved", "confirmed"],
    })

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    for (const participant of participants) {
      const email = String(participant.email ?? "")

      if (!email) {
        continue
      }

      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "email", "metadata"],
        filters: { email },
      })

      const customer = customers?.[0] as Record<string, unknown> | undefined
      const metadata =
        (customer?.metadata as Record<string, unknown> | null) ?? null
      const preferences = readGroupBuyingPreferences(metadata)

      if (!preferences.notify_progress) {
        continue
      }

      const payload: NotificationPayload = {
        type: "progress",
        email,
        group_deal_id: groupDealId,
        title: String(deal.title ?? "공동구매"),
        message: `공동구매 진행 상태가 업데이트되었습니다. (상태: ${String(deal.status ?? "")})`,
      }

      await appendNotificationLog(container, email, payload)
    }
  }
}

export const config: SubscriberConfig = {
  event: ["group_deal.waitlist_matched", "group_deal.updated"],
  context: {
    subscriberId: "group-deal-notifications",
  },
}
