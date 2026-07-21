"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import { resolveMedusaErrorMessage } from "@lib/util/medusa-error"
import { revalidateTag } from "next/cache"
import type { GroupDealDocumentParseResponse } from "types/group-deal-document-ai"

export type GroupDealDocumentParseActionResult =
  | {
      ok: true
      data: GroupDealDocumentParseResponse
    }
  | {
      ok: false
      error: string
    }

export type GroupDealDocumentAiJobActionResult =
  | {
      ok: true
      data: { job: Record<string, unknown> }
    }
  | {
      ok: false
      error: string
    }

const authedFetch = async <T>(
  path: string,
  init?: {
    method?: string
    body?: Record<string, unknown>
  }
): Promise<T> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client.fetch<T>(path, {
    method: init?.method ?? "GET",
    body: init?.body,
    headers,
  })
}

const runDocumentAiAction = async <T>(
  action: () => Promise<T>
): Promise<{ ok: true; data: T } | { ok: false; error: string }> => {
  try {
    const headers = await getAuthHeaders()

    if (!("authorization" in headers) || !headers.authorization) {
      return {
        ok: false,
        error: "로그인이 필요합니다. 계정에 로그인한 뒤 다시 시도해 주세요.",
      }
    }

    const data = await action()

    revalidateTag("group-deals")

    return { ok: true, data }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[group-deal-document-ai] Request failed.", error)
    }

    return {
      ok: false,
      error: resolveMedusaErrorMessage(error),
    }
  }
}

export async function parseGroupDealReceiptDocument(
  dealId: string,
  input: {
    image_base64: string
    filename?: string
  }
): Promise<GroupDealDocumentParseActionResult> {
  return runDocumentAiAction(() =>
    authedFetch<GroupDealDocumentParseResponse>(
      `/store/me/group-deals/${dealId}/receipt/parse`,
      {
        method: "POST",
        body: input,
      }
    )
  )
}

export async function parseGroupDealTrackingDocument(
  dealId: string,
  input: {
    image_base64: string
    filename?: string
  }
): Promise<GroupDealDocumentParseActionResult> {
  return runDocumentAiAction(() =>
    authedFetch<GroupDealDocumentParseResponse>(
      `/store/me/group-deals/${dealId}/tracking/parse`,
      {
        method: "POST",
        body: input,
      }
    )
  )
}

export async function retrieveGroupDealDocumentAiJob(
  dealId: string,
  jobId: string
): Promise<GroupDealDocumentAiJobActionResult> {
  return runDocumentAiAction(() =>
    authedFetch<{ job: Record<string, unknown> }>(
      `/store/me/group-deals/${dealId}/document-ai/jobs/${jobId}`
    )
  )
}
