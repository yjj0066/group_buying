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

  sessionStorage.setItem(LEADER_CREATE_WIZARD_STORAGE_KEY, JSON.stringify(draft))

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

