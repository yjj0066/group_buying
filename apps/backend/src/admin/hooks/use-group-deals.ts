import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { adminFetch, adminDownload, fileToBase64DataUrl } from "../lib/admin-fetch"
import type { AdminGroupDeal, AdminProductOption } from "../lib/group-deal"
import { GroupDealReceiptStatus } from "../../../types/group-buying"

export const groupDealKeys = {
  all: ["admin", "group-deals"] as const,
  detail: (id: string) => ["admin", "group-deals", id] as const,
  products: ["admin", "products", "group-deal-form"] as const,
}

export const useAdminGroupDeals = () => {
  return useQuery({
    queryKey: groupDealKeys.all,
    queryFn: () =>
      adminFetch<{ group_deals: AdminGroupDeal[] }>("/admin/group-deals"),
  })
}

export const useAdminGroupDeal = (id: string) => {
  return useQuery({
    queryKey: groupDealKeys.detail(id),
    queryFn: () =>
      adminFetch<{ group_deal: AdminGroupDeal }>(`/admin/group-deals/${id}`),
    enabled: Boolean(id),
  })
}

export const useAdminProductsForGroupDeal = () => {
  return useQuery({
    queryKey: groupDealKeys.products,
    queryFn: async () => {
      const response = await adminFetch<{
        products: AdminProductOption[]
      }>("/admin/products?limit=100&fields=id,title,*variants,*variants.prices")

      return response.products ?? []
    },
  })
}

export const useCreateGroupDeal = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      adminFetch<{ group_deal: AdminGroupDeal }>("/admin/group-deals", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupDealKeys.all })
    },
  })
}

export const useUpdateGroupDeal = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      adminFetch<{ group_deal: AdminGroupDeal }>(`/admin/group-deals/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupDealKeys.all })
      queryClient.invalidateQueries({ queryKey: groupDealKeys.detail(id) })
    },
  })
}

export const useCancelGroupDeal = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload?: { reason?: string | null }) =>
      adminFetch<{ group_deal: AdminGroupDeal }>(
        `/admin/group-deals/${id}/cancel`,
        {
          method: "POST",
          body: payload ?? {},
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupDealKeys.all })
      queryClient.invalidateQueries({ queryKey: groupDealKeys.detail(id) })
    },
  })
}

export const useDeleteGroupDeal = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      adminFetch<{ id: string; deleted: boolean }>(
        `/admin/group-deals/${id}`,
        {
          method: "DELETE",
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupDealKeys.all })
    },
  })
}

export const useUploadGroupDealReceipt = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      image_base64?: string
      image_url?: string
      filename?: string
      status?: GroupDealReceiptStatus
      note?: string | null
    }) =>
      adminFetch<{ group_deal: AdminGroupDeal }>(
        `/admin/group-deals/${id}/receipt`,
        {
          method: "POST",
          body: payload,
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupDealKeys.detail(id) })
    },
  })
}

export const useUpdateGroupDealTracking = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      entries: Array<{
        participant_id: string
        tracking_number: string
        carrier?: string | null
      }>
    }) =>
      adminFetch<{ group_deal: AdminGroupDeal }>(
        `/admin/group-deals/${id}/tracking`,
        {
          method: "POST",
          body: payload,
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupDealKeys.detail(id) })
    },
  })
}

export const downloadGroupDealPackingSlip = async (
  id: string,
  format: "csv" | "json" = "csv"
) => {
  if (format === "json") {
    return adminFetch<{ packing_slip: unknown }>(
      `/admin/group-deals/${id}/packing-slip?format=json`
    )
  }

  await adminDownload(
    `/admin/group-deals/${id}/packing-slip?format=csv`,
    `packing-slip-${id}.csv`
  )
}

export const uploadReceiptFile = async (file: File) => {
  return fileToBase64DataUrl(file)
}
