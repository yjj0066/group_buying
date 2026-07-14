import { MedusaError } from "@medusajs/framework/utils"
import {
  GroupDealJoinSelectionInput,
  GroupDealPaymentPhaseMode,
  GroupDealSecondPaymentStatus,
  GroupDealShippingFeeStatus,
} from "../types/group-buying"

export type GroupDealOptionLike = {
  id: string
  option_key: string
  label: string
  deal_price?: number | string | null
  max_quantity?: number | null
  current_quantity?: number
  is_active?: boolean
}

export type GroupDealForOptionsLike = {
  deal_price: number | string
  max_quantity?: number | null
  current_quantity?: number
  payment_phase_mode?: GroupDealPaymentPhaseMode | string
  shipping_fee_status?: GroupDealShippingFeeStatus | string
  estimated_shipping_fee?: number | string | null
}

/**
 * 옵션별 1차금 단가 결정
 * 옵션에 deal_price가 있으면 사용, 없으면 공구 기본 deal_price
 */
export const resolveOptionUnitPrice = (
  option: GroupDealOptionLike,
  deal: GroupDealForOptionsLike
): number => {
  if (option.deal_price != null) {
    return Number(option.deal_price)
  }

  return Number(deal.deal_price)
}

export const sumSelectionQuantities = (
  selections: GroupDealJoinSelectionInput[]
): number => {
  return selections.reduce((total, item) => total + item.quantity, 0)
}

/**
 * 1차금(상품가) 합계 — 2차 배송비는 포함하지 않음
 */
export const computeFirstPaymentAmount = (input: {
  deal: GroupDealForOptionsLike
  options: GroupDealOptionLike[]
  selections: GroupDealJoinSelectionInput[]
  fallbackQuantity?: number
}): number => {
  const { deal, options, selections, fallbackQuantity = 1 } = input

  if (!selections.length) {
    return Number(deal.deal_price) * fallbackQuantity
  }

  const optionMap = new Map(options.map((option) => [option.id, option]))

  return selections.reduce((total, selection) => {
    const option = optionMap.get(selection.option_id)

    if (!option) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unknown option: ${selection.option_id}`
      )
    }

    const unitPrice = resolveOptionUnitPrice(option, deal)

    return total + unitPrice * selection.quantity
  }, 0)
}

export const buildSelectionSnapshots = (input: {
  deal: GroupDealForOptionsLike
  options: GroupDealOptionLike[]
  selections: GroupDealJoinSelectionInput[]
}) => {
  const optionMap = new Map(input.options.map((option) => [option.id, option]))

  return input.selections.map((selection) => {
    const option = optionMap.get(selection.option_id)

    if (!option) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unknown option: ${selection.option_id}`
      )
    }

    return {
      option_id: selection.option_id,
      quantity: selection.quantity,
      unit_price: resolveOptionUnitPrice(option, input.deal),
    }
  })
}

/**
 * 멤버/옵션별 수량 한도 검증
 */
export const assertSelectionsWithinLimits = (input: {
  deal: GroupDealForOptionsLike
  options: GroupDealOptionLike[]
  selections: GroupDealJoinSelectionInput[]
  fallbackQuantity?: number
}): void => {
  const { deal, options, selections, fallbackQuantity = 1 } = input
  const totalQuantity = selections.length
    ? sumSelectionQuantities(selections)
    : fallbackQuantity

  if (totalQuantity <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "At least one item must be selected"
    )
  }

  if (deal.max_quantity != null) {
    const remaining = deal.max_quantity - Number(deal.current_quantity ?? 0)

    if (totalQuantity > remaining) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Only ${Math.max(remaining, 0)} unit(s) remaining for this group deal`
      )
    }
  }

  if (!selections.length) {
    return
  }

  const optionMap = new Map(options.map((option) => [option.id, option]))

  for (const selection of selections) {
    const option = optionMap.get(selection.option_id)

    if (!option) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Option ${selection.option_id} does not belong to this group deal`
      )
    }

    if (option.is_active === false) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Option "${option.label}" is not available`
      )
    }

    if (option.max_quantity != null) {
      const optionRemaining =
        option.max_quantity - Number(option.current_quantity ?? 0)

      if (selection.quantity > optionRemaining) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `Only ${Math.max(optionRemaining, 0)} unit(s) remaining for "${option.label}"`
        )
      }
    }
  }
}

export const normalizeJoinSelections = (input: {
  quantity?: number
  selections?: GroupDealJoinSelectionInput[]
}): GroupDealJoinSelectionInput[] => {
  if (input.selections?.length) {
    return input.selections
  }

  return []
}

export const resolveParticipantQuantity = (input: {
  quantity?: number
  selections?: GroupDealJoinSelectionInput[]
}): number => {
  if (input.selections?.length) {
    return sumSelectionQuantities(input.selections)
  }

  return input.quantity ?? 1
}
