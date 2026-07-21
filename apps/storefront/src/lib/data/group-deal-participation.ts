"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import medusaError from "@lib/util/medusa-error"
import { isMockFallbackEnabled } from "@lib/util/persistence-policy"
import { revalidateTag } from "next/cache"
import type {
  GroupDealParticipation,
  VirtualAccountInfo,
} from "types/group-deal"
import {
  createMockParticipation,
  getStoreGroupDeal,
} from "@lib/data/group-deals"

export type DealApplicationRefundBankAccount = {
  bank_code: string
  bank_name: string
  account_number: string
  account_holder: string
}

export const submitDealApplication = async (input: {
  dealId: string
  optionId?: string
  memberLabel: string
  quantity?: number
  recipientName: string
  phone: string
  address: string
  deliveryNote?: string
  countryCode?: string
  refundBankAccount?: DealApplicationRefundBankAccount
}): Promise<GroupDealParticipation> => {
  const headers = await getAuthHeaders()
  const quantity = input.quantity ?? 1

  if (!("authorization" in headers && headers.authorization)) {
    if (!isMockFallbackEnabled()) {
      throw new Error(
        "로그인이 필요합니다. 계정에 로그인한 뒤 다시 시도해 주세요."
      )
    }
  } else {
    try {
      const normalizedOptionId = input.optionId?.trim()

      const response = await sdk.client.fetch<{
        participation: GroupDealParticipation & {
          virtual_account?: VirtualAccountInfo | null
        }
      }>(`/store/group-deals/${input.dealId}/apply`, {
        method: "POST",
        headers,
        body: {
          ...(normalizedOptionId ? { option_id: normalizedOptionId } : {}),
          member_label: input.memberLabel,
          quantity,
          recipient_name: input.recipientName,
          phone: input.phone,
          address: input.address,
          delivery_note: input.deliveryNote,
          country_code: (input.countryCode ?? "kr").toLowerCase(),
        },
      })

      revalidateTag("group-deals")

      if (response.participation) {
        return response.participation
      }

      if (!isMockFallbackEnabled()) {
        throw new Error(
          "참여 신청이 처리되었지만 응답에 참여 정보가 없습니다. 잠시 후 다시 시도해 주세요."
        )
      }
    } catch (error) {
      if (!isMockFallbackEnabled()) {
        medusaError(error)
      }
    }
  }

  const deal = await getStoreGroupDeal(input.dealId)

  if (!deal) {
    throw new Error("공구 정보를 찾을 수 없습니다.")
  }

  const option = deal.options?.find((item) => item.id === input.optionId)
  const unitPrice = option?.deal_price ?? deal.deal_price

  return createMockParticipation(
    input.dealId,
    input.optionId ?? "",
    input.memberLabel,
    deal,
    unitPrice * quantity
  )
}

export const confirmVirtualAccountDeposit = async (
  dealId: string,
  participantId: string
): Promise<void> => {
  const headers = await getAuthHeaders()

  if ("authorization" in headers && headers.authorization) {
    try {
      await sdk.client.fetch(`/store/group-deals/${dealId}/deposit-confirm`, {
        method: "POST",
        headers,
        body: {
          participant_id: participantId,
        },
      })

      revalidateTag("group-deals")
      return
    } catch (error) {
      if (!isMockFallbackEnabled()) {
        medusaError(error)
      }
    }
  } else if (!isMockFallbackEnabled()) {
    throw new Error(
      "로그인이 필요합니다. 계정에 로그인한 뒤 다시 시도해 주세요."
    )
  }

  if (isMockFallbackEnabled()) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return
  }

  throw new Error(
    "로그인이 필요합니다. 계정에 로그인한 뒤 다시 시도해 주세요."
  )
}

export const cancelExpiredParticipation = async (
  dealId: string,
  participantId: string
): Promise<void> => {
  const headers = await getAuthHeaders()

  try {
    await sdk.client.fetch(
      `/store/group-deals/${dealId}/participations/${participantId}/cancel`,
      {
        method: "POST",
        headers,
      }
    )
    return
  } catch {
    if (!isMockFallbackEnabled()) {
      return
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 200))
}
