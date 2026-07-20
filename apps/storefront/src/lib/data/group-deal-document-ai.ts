"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import medusaError from "@lib/util/medusa-error"
import { revalidateTag } from "next/cache"
import type { GroupDealDocumentParseResponse } from "types/group-deal-document-ai"

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

export async function parseGroupDealReceiptDocument(
  dealId: string,
  input: {
    image_base64: string
    filename?: string
  }
) {
  const response = await authedFetch<GroupDealDocumentParseResponse>(
    `/store/me/group-deals/${dealId}/receipt/parse`,
    {
      method: "POST",
      body: input,
    }
  ).catch(medusaError)

  revalidateTag("group-deals")

  return response
}

export async function parseGroupDealTrackingDocument(
  dealId: string,
  input: {
    image_base64: string
    filename?: string
  }
) {
  const response = await authedFetch<GroupDealDocumentParseResponse>(
    `/store/me/group-deals/${dealId}/tracking/parse`,
    {
      method: "POST",
      body: input,
    }
  ).catch(medusaError)

  revalidateTag("group-deals")

  return response
}

export async function retrieveGroupDealDocumentAiJob(
  dealId: string,
  jobId: string
) {
  return authedFetch<{ job: Record<string, unknown> }>(
    `/store/me/group-deals/${dealId}/document-ai/jobs/${jobId}`
  ).catch(medusaError)
}
