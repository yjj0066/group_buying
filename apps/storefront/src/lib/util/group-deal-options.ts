import type { GroupDeal, GroupDealOption } from "types/group-deal"
import { getOptionRemainingQuantity } from "types/group-deal"

export const getDealSeatOptions = (deal: GroupDeal): GroupDealOption[] => {
  const activeOptions = (deal.options ?? []).filter((option) => option.is_active)
  const memberOptions = activeOptions.filter(
    (option) => option.option_type === "member"
  )

  return memberOptions.length > 0 ? memberOptions : activeOptions
}

export const dealRequiresOptionSelection = (deal: GroupDeal): boolean =>
  getDealSeatOptions(deal).length > 0

export const getSelectableDealOptions = (deal: GroupDeal): GroupDealOption[] =>
  getDealSeatOptions(deal).filter((option) => {
    const remaining = getOptionRemainingQuantity(option)
    return remaining == null || remaining > 0
  })
