"use server"

export async function listHostedGroupDeals(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.listHostedGroupDeals as (...a: any[]) => any)(...args)
}

export async function listHostedDealParticipations(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.listHostedDealParticipations as (...a: any[]) => any)(...args)
}

export async function getHostedGroupDeal(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.getHostedGroupDeal as (...a: any[]) => any)(...args)
}

export async function getParticipationForDeal(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.getParticipationForDeal as (...a: any[]) => any)(...args)
}

export async function getParticipationById(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.getParticipationById as (...a: any[]) => any)(...args)
}

export type CreateHostedGroupDealActionResult =
  | {
      ok: true
      group_deal: import("types/account-group-deals").AccountGroupDeal
    }
  | {
      ok: false
      error: string
    }

export type RecordLeaderDepositActionResult =
  | {
      ok: true
      group_deal: import("types/account-group-deals").AccountGroupDeal
      deposit_recorded: boolean
    }
  | {
      ok: false
      error: string
    }

export async function createHostedGroupDeal(
  input: import("./account-group-deals-queries").CreateHostedGroupDealInput
): Promise<CreateHostedGroupDealActionResult> {
  try {
    const mod = await import("./account-group-deals-queries")
    const group_deal = await mod.createHostedGroupDeal(input)

    return { ok: true, group_deal }
  } catch (error) {
    const { resolveMedusaErrorMessage } = await import("@lib/util/medusa-error")

    return { ok: false, error: resolveMedusaErrorMessage(error) }
  }
}

export async function recordLeaderDeposit(
  dealId: string,
  input: {
    deposit_amount: number
    deposit_payment_key: string
  }
): Promise<RecordLeaderDepositActionResult> {
  try {
    const mod = await import("./account-group-deals-queries")
    const result = await mod.recordLeaderDeposit(dealId, input)

    return { ok: true, ...result }
  } catch (error) {
    const { resolveMedusaErrorMessage } = await import("@lib/util/medusa-error")

    return { ok: false, error: resolveMedusaErrorMessage(error) }
  }
}

export async function confirmParticipantDelivery(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.confirmParticipantDelivery as (...a: any[]) => any)(...args)
}

export async function listMyParticipations(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.listMyParticipations as (...a: any[]) => any)(...args)
}

export async function getMyParticipation(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.getMyParticipation as (...a: any[]) => any)(...args)
}

export async function updateParticipationShippingAddress(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.updateParticipationShippingAddress as (...a: any[]) => any)(...args)
}

export async function listMySettlements(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.listMySettlements as (...a: any[]) => any)(...args)
}

export async function listSavedPaymentMethods(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.listSavedPaymentMethods as (...a: any[]) => any)(...args)
}

export async function addSavedPaymentMethod(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.addSavedPaymentMethod as (...a: any[]) => any)(...args)
}

export async function deleteSavedPaymentMethod(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.deleteSavedPaymentMethod as (...a: any[]) => any)(...args)
}

export async function retrieveGroupBuyingPreferences(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.retrieveGroupBuyingPreferences as (...a: any[]) => any)(...args)
}

export async function updateGroupBuyingPreferences(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.updateGroupBuyingPreferences as (...a: any[]) => any)(...args)
}

export async function saveMyProfileSettings(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.saveMyProfileSettings as (...a: any[]) => any)(...args)
}

export async function requestCustomerWithdrawal(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.requestCustomerWithdrawal as (...a: any[]) => any)(...args)
}

export async function getBankAccount(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.getBankAccount as (...a: any[]) => any)(...args)
}

export async function saveBankAccount(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.saveBankAccount as (...a: any[]) => any)(...args)
}

export async function submitParticipationReview(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.submitParticipationReview as (...a: any[]) => any)(...args)
}

export async function submitParticipationDispute(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.submitParticipationDispute as (...a: any[]) => any)(...args)
}

export async function createStripeSetupSession(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.createStripeSetupSession as (...a: any[]) => any)(...args)
}

export async function completeStripeSetup(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.completeStripeSetup as (...a: any[]) => any)(...args)
}

export async function createTossBillingSession(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.createTossBillingSession as (...a: any[]) => any)(...args)
}

export async function cancelMyParticipation(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.cancelMyParticipation as (...a: any[]) => any)(...args)
}

export async function retrievePriceRecommendations(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.retrievePriceRecommendations as (...a: any[]) => any)(...args)
}

export async function applyPriceRecommendations(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.applyPriceRecommendations as (...a: any[]) => any)(...args)
}

export async function retrieveLeaderTrustProfile(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.retrieveLeaderTrustProfile as (...a: any[]) => any)(...args)
}

export async function reportLeaderReview(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.reportLeaderReview as (...a: any[]) => any)(...args)
}

export type { CreateHostedGroupDealInput } from "./account-group-deals-queries"
