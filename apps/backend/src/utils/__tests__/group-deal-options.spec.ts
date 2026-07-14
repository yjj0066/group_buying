import { MedusaError } from "@medusajs/framework/utils"
import {
  assertSelectionsWithinLimits,
  computeFirstPaymentAmount,
  resolveOptionUnitPrice,
  sumSelectionQuantities,
} from "../group-deal-options"
import {
  GroupDealPaymentPhaseMode,
  GroupDealSecondPaymentStatus,
} from "../../types/group-buying"
import {
  isSplitPaymentDeal,
  resolveInitialSecondPaymentStatus,
} from "../group-deal-payment-phases"

describe("group-deal-options", () => {
  const deal = {
    deal_price: 10000,
    max_quantity: 100,
    current_quantity: 20,
  }

  const options = [
    {
      id: "gopt_a",
      option_key: "member_a",
      label: "Member A",
      deal_price: 12000,
      max_quantity: 30,
      current_quantity: 10,
      is_active: true,
    },
    {
      id: "gopt_b",
      option_key: "member_b",
      label: "Member B",
      max_quantity: 50,
      current_quantity: 5,
      is_active: true,
    },
  ]

  it("computes first payment from option-specific prices", () => {
    const amount = computeFirstPaymentAmount({
      deal,
      options,
      selections: [
        { option_id: "gopt_a", quantity: 2 },
        { option_id: "gopt_b", quantity: 1 },
      ],
    })

    expect(amount).toBe(12000 * 2 + 10000 * 1)
  })

  it("rejects selections exceeding per-option max quantity", () => {
    expect(() =>
      assertSelectionsWithinLimits({
        deal,
        options,
        selections: [{ option_id: "gopt_a", quantity: 25 }],
      })
    ).toThrow(MedusaError.Types.NOT_ALLOWED)
  })

  it("sums selection quantities", () => {
    expect(
      sumSelectionQuantities([
        { option_id: "gopt_a", quantity: 2 },
        { option_id: "gopt_b", quantity: 3 },
      ])
    ).toBe(5)
  })

  it("falls back to deal price when option has no override", () => {
    expect(resolveOptionUnitPrice(options[1], deal)).toBe(10000)
  })
})

describe("group-deal-payment-phases", () => {
  it("detects split payment deals", () => {
    expect(
      isSplitPaymentDeal({
        payment_phase_mode: GroupDealPaymentPhaseMode.SPLIT_PRODUCT_SHIPPING,
      })
    ).toBe(true)
  })

  it("sets pending_quote when shipping fee is unknown", () => {
    expect(
      resolveInitialSecondPaymentStatus({
        payment_phase_mode: GroupDealPaymentPhaseMode.SPLIT_PRODUCT_SHIPPING,
      })
    ).toBe(GroupDealSecondPaymentStatus.PENDING_QUOTE)
  })
})
