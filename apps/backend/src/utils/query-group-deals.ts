import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MedusaContainer } from "@medusajs/framework/types"
import { GroupDealStatus } from "../types/group-buying"

type QueryGroupDealFilters = {
  id?: string
  status?: GroupDealStatus
}

export async function queryGroupDeals(
  container: MedusaContainer,
  filters: QueryGroupDealFilters = {},
  options: { withParticipants?: boolean } = {}
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const fields = options.withParticipants
    ? ["*", "participants.*"]
    : ["*"]

  const { data } = await query.graph({
    entity: "group_deals",
    fields,
    filters,
  })

  return data ?? []
}

export async function queryGroupDeal(
  container: MedusaContainer,
  id: string,
  options: { withParticipants?: boolean } = {}
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const fields = options.withParticipants
    ? ["*", "participants.*"]
    : ["*"]

  const {
    data: [groupDeal],
  } = await query.graph(
    {
      entity: "group_deal",
      fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  )

  return groupDeal
}
