import {
  DEFAULT_GROUP_BUYING_GOODS_TYPE,
} from "@lib/constants/group-buying-catalog"
import { MOCK_LEADER_CREATE_DRAFT } from "@lib/data/mock-leader-create-draft"

import { LEADER_CREATE_WIZARD_STORAGE_KEY } from "./constants"

import {
  createEmptyDraft,
  type LeaderCreateDraft,
} from "./types"



export const loadLeaderCreateDraft = (): LeaderCreateDraft => {

  if (typeof window === "undefined") {

    return createEmptyDraft()

  }



  const raw = sessionStorage.getItem(LEADER_CREATE_WIZARD_STORAGE_KEY)



  if (!raw) {

    return createEmptyDraft()

  }



  try {

    const parsed = JSON.parse(raw) as Partial<LeaderCreateDraft>

    const empty = createEmptyDraft()



    return {

      ...empty,

      ...parsed,

      goodsType: parsed.goodsType?.trim() || DEFAULT_GROUP_BUYING_GOODS_TYPE,

      memberSeats:
        parsed.memberSeats?.length ? parsed.memberSeats : empty.memberSeats,

      shippingMethods:

        parsed.shippingMethods?.length ? parsed.shippingMethods : empty.shippingMethods,

      refundAccount: {

        ...empty.refundAccount,

        ...parsed.refundAccount,

      },

    }

  } catch {

    return createEmptyDraft()

  }

}



export const saveLeaderCreateDraft = (draft: LeaderCreateDraft) => {
  try {
    sessionStorage.setItem(
      LEADER_CREATE_WIZARD_STORAGE_KEY,
      JSON.stringify(draft)
    )
  } catch (error) {
    const name =
      error instanceof DOMException
        ? error.name
        : error instanceof Error
          ? error.name
          : ""

    if (name === "QuotaExceededError") {
      throw new Error(
        "브라우저 저장 공간 한도를 초과했습니다. 사진 크기를 줄이거나 사진을 제거한 뒤 다시 시도해 주세요."
      )
    }

    throw error
  }
}



export const clearLeaderCreateDraft = () => {
  sessionStorage.removeItem(LEADER_CREATE_WIZARD_STORAGE_KEY)
}

export const seedLeaderCreateMockDraft = (): LeaderCreateDraft => {
  const draft: LeaderCreateDraft = {
    ...MOCK_LEADER_CREATE_DRAFT,
    memberSeats: MOCK_LEADER_CREATE_DRAFT.memberSeats.map((seat) => ({
      ...seat,
    })),
    shippingMethods: MOCK_LEADER_CREATE_DRAFT.shippingMethods.map((method) => ({
      ...method,
    })),
    refundAccount: { ...MOCK_LEADER_CREATE_DRAFT.refundAccount },
    depositPaymentExpiresAt: undefined,
    createdDealId: undefined,
  }

  saveLeaderCreateDraft(draft)

  return draft
}

