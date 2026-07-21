import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import { getMockLeaderDealParticipations } from "@lib/data/mock-leader-participations"
import type { LeaderDealParticipation } from "types/leader-deal-participation"
import type { ParticipationShippingAddress } from "types/account-group-deals"
import { calculateDealApplicationTotal } from "@lib/constants/group-buying-fees"
import { isMockFallbackEnabled } from "@lib/util/persistence-policy"

const formatShippingAddress = (
  address: ParticipationShippingAddress | null | undefined
): string => {
  if (!address) {
    return ""
  }

  const parts = [
    address.address_line_1,
    address.address_line_2,
    address.postal_code,
  ].filter(Boolean)

  return parts.join(" ").trim()
}

const mapApiParticipation = (
  participation: Record<string, unknown>,
  dealUnitPrice: number
): LeaderDealParticipation | null => {
  const status = String(participation.status ?? "")

  if (status !== "confirmed" && status !== "payment_complete") {
    return null
  }

  const shippingAddress = participation.shipping_address as
    | ParticipationShippingAddress
    | null
    | undefined

  const quantity = Number(participation.quantity ?? 1)
  const assignedQuantity =
    participation.assigned_quantity != null
      ? Number(participation.assigned_quantity)
      : quantity
  const depositAmount =
    participation.deposit_amount != null
      ? Number(participation.deposit_amount)
      : calculateDealApplicationTotal(dealUnitPrice, quantity).total

  return {
    participant_id: String(participation.participant_id ?? participation.id),
    recipient_name:
      shippingAddress?.recipient_name ??
      String(participation.recipient_name ?? "참여자"),
    phone: shippingAddress?.phone ?? String(participation.phone ?? ""),
    address:
      formatShippingAddress(shippingAddress) ||
      String(participation.address ?? ""),
    member_label: String(
      participation.member_label ?? participation.option_label ?? ""
    ),
    option_id: String(participation.option_id ?? ""),
    quantity,
    assigned_quantity: assignedQuantity,
    deposit_amount: depositAmount,
    status,
    stage:
      typeof participation.stage === "string" ? participation.stage : undefined,
    tracking_number:
      participation.tracking_number != null
        ? String(participation.tracking_number)
        : null,
    carrier:
      participation.carrier != null ? String(participation.carrier) : null,
  }
}

export async function listHostedDealParticipations(
  dealId: string,
  dealUnitPrice = 0
): Promise<LeaderDealParticipation[]> {
  try {
    const headers = await getAuthHeaders()

    if ("authorization" in headers && headers.authorization) {
      const response = await sdk.client.fetch<{
        participations: Record<string, unknown>[]
      }>(`/store/me/group-deals/${dealId}/participations`, {
        method: "GET",
        headers,
        cache: "no-store",
      })

      const mapped = (response.participations ?? [])
        .map((item) => mapApiParticipation(item, dealUnitPrice))
        .filter((item): item is LeaderDealParticipation => item != null)

      if (mapped.length) {
        return mapped
      }
    }
  } catch {
    // fall through to mock data
  }

  if (isMockFallbackEnabled()) {
    return getMockLeaderDealParticipations(dealId) ?? []
  }

  return []
}
