"use server"

import { sdk } from "@lib/config"
import {
  GroupDealResponse,
  GroupDealsResponse,
  JoinGroupDealResponse,
} from "types/group-deal"

export async function listGroupDeals() {
  try {
    return await sdk.client.fetch<GroupDealsResponse>("/store/group-deals", {
      method: "GET",
      next: { tags: ["group-deals"] },
    })
  } catch {
    return { group_deals: [] }
  }
}

export async function retrieveGroupDeal(id: string) {
  return sdk.client.fetch<GroupDealResponse>(`/store/group-deals/${id}`, {
    method: "GET",
    next: { tags: [`group-deal-${id}`] },
  })
}

export async function joinGroupDeal(
  id: string,
  data: { email: string; quantity: number }
) {
  return sdk.client.fetch<JoinGroupDealResponse>(
    `/store/group-deals/${id}/join`,
    {
      method: "POST",
      body: data,
    }
  )
}
