"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import { retrieveCustomer } from "@lib/data/customer"
import medusaError from "@lib/util/medusa-error"
import {
  createEmptyDraft,
  type LeaderCreateDraft,
} from "@modules/group-buying/components/leader-create-wizard/types"

const METADATA_KEY = "leader_create_wizard_draft"

const normalizeDraft = (
  parsed: Partial<LeaderCreateDraft> | null | undefined
): LeaderCreateDraft | null => {
  if (!parsed || typeof parsed !== "object") {
    return null
  }

  const empty = createEmptyDraft()

  return {
    ...empty,
    ...parsed,
    memberSeats:
      parsed.memberSeats?.length ? parsed.memberSeats : empty.memberSeats,
    shippingMethods:
      parsed.shippingMethods?.length
        ? parsed.shippingMethods
        : empty.shippingMethods,
    refundAccount: {
      ...empty.refundAccount,
      ...(parsed.refundAccount ?? {}),
    },
  }
}

export async function loadLeaderCreateWizardDraftFromAccount(): Promise<LeaderCreateDraft | null> {
  const customer = await retrieveCustomer().catch(() => null)

  if (!customer?.metadata) {
    return null
  }

  const raw = (customer.metadata as Record<string, unknown>)[METADATA_KEY]

  if (!raw || typeof raw !== "object") {
    return null
  }

  return normalizeDraft(raw as Partial<LeaderCreateDraft>)
}

const stripDraftImageForAccountSync = (
  draft: LeaderCreateDraft
): LeaderCreateDraft => ({
  ...draft,
  productImageDataUrl: null,
})

export async function saveLeaderCreateWizardDraftToAccount(
  draft: LeaderCreateDraft
): Promise<void> {
  const draftForAccount = stripDraftImageForAccountSync(draft)
  const headers = await getAuthHeaders()

  if (!("authorization" in headers) || !headers.authorization) {
    return
  }

  const customer = await retrieveCustomer()

  if (!customer) {
    return
  }

  const metadata = {
    ...(((customer.metadata as Record<string, unknown> | null) ?? {}) as Record<
      string,
      unknown
    >),
    [METADATA_KEY]: draftForAccount,
  }

  await sdk.store.customer
    .update(
      {
        metadata,
      },
      {},
      headers
    )
    .catch(medusaError)
}

export async function clearLeaderCreateWizardDraftFromAccount(): Promise<void> {
  try {
    const headers = await getAuthHeaders()

    if (!("authorization" in headers) || !headers.authorization) {
      return
    }

    const customer = await retrieveCustomer()

    if (!customer) {
      return
    }

    const metadata = {
      ...(((customer.metadata as Record<string, unknown> | null) ??
        {}) as Record<string, unknown>),
    }

    delete metadata[METADATA_KEY]

    await sdk.store.customer
      .update(
        {
          metadata,
        },
        {},
        headers
      )
      .catch((error) => {
        console.warn(
          "[leader-create] Failed to clear account draft after create",
          error
        )
      })
  } catch (error) {
    console.warn(
      "[leader-create] Failed to clear account draft after create",
      error
    )
  }
}
