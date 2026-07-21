import {
  GroupDealDepositStatus,
  GroupDealDocumentAiStatus,
  GroupDealParticipantStatus,
  GroupDealStatus,
} from "../types/group-buying"
import {
  buildSettlementRecords,
  serializeAccountGroupDeal,
  serializeAccountGroupDealReportDetails,
} from "./group-deal-account"
import {
  buildDocumentAiResultPayload,
  mapFlaskExtractToInvoiceRows,
  mapFlaskExtractToStructuredReceipt,
} from "./group-deal-document-ai"
import type { FlaskDocumentAiJob } from "./flask-document-ai-client"
import {
  generateLeaderDepositVirtualAccount,
  generateVirtualAccount,
} from "./virtual-account"

export type Phase7SmokeCheck = {
  id: string
  label: string
  pass: boolean
  detail?: string
}

const SEARCH_MIN_LENGTH = 2

type SmokeDealOption = {
  option_type: "member" | "version" | "custom"
  label: string
  max_quantity?: number | null
  current_quantity?: number | null
  remaining_quantity?: number | null
}

type SmokeDeal = {
  title: string
  description?: string
  deal_price: number
  ends_at: string
  starts_at: string
  is_urgent_fill?: boolean
  metadata?: Record<string, unknown>
  options?: SmokeDealOption[]
}

type SmokeFilterState = {
  query: string
  idolGroup: string
  member: string
  goodsType: string
  favoriteMember: string
  vacantOnly: boolean
  urgentOnly: boolean
  minPrice: number | null
  maxPrice: number | null
}

const getOptionRemainingQuantity = (option: SmokeDealOption): number | null => {
  if (option.remaining_quantity != null) {
    return option.remaining_quantity
  }

  if (option.max_quantity != null && option.current_quantity != null) {
    return Math.max(0, option.max_quantity - option.current_quantity)
  }

  return null
}

const hasMemberVacancy = (deal: SmokeDeal, member: string): boolean => {
  const option = (deal.options ?? []).find(
    (item) => item.option_type === "member" && item.label === member
  )

  if (!option) {
    return false
  }

  const remaining = getOptionRemainingQuantity(option)
  return remaining == null || remaining > 0
}

const matchesQuery = (deal: SmokeDeal, query: string): boolean => {
  const normalized = query.trim().toLowerCase()

  if (!normalized) {
    return true
  }

  if (normalized.length < SEARCH_MIN_LENGTH) {
    return false
  }

  const haystack = [
    deal.title,
    deal.description ?? "",
    String(deal.metadata?.idol_group ?? ""),
    ...(deal.options ?? []).map((option) => option.label),
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(normalized)
}

const filterGroupDeals = (
  deals: SmokeDeal[],
  filters: SmokeFilterState
): SmokeDeal[] =>
  deals.filter((deal) => {
    if (!matchesQuery(deal, filters.query)) {
      return false
    }

    const idolGroup = deal.metadata?.idol_group

    if (filters.idolGroup && idolGroup !== filters.idolGroup) {
      return false
    }

    const goodsType = deal.metadata?.goods_type

    if (filters.goodsType && goodsType !== filters.goodsType) {
      return false
    }

    if (filters.member) {
      const hasMember = (deal.options ?? []).some(
        (option) =>
          option.option_type === "member" && option.label === filters.member
      )

      if (!hasMember) {
        return false
      }
    }

    if (filters.minPrice != null && deal.deal_price < filters.minPrice) {
      return false
    }

    if (filters.maxPrice != null && deal.deal_price > filters.maxPrice) {
      return false
    }

    if (filters.urgentOnly && !deal.is_urgent_fill) {
      return false
    }

    if (filters.vacantOnly && filters.favoriteMember) {
      if (!hasMemberVacancy(deal, filters.favoriteMember)) {
        return false
      }
    }

    return true
  })

export type DepositConfirmGuardInput = {
  group_deal_id: string
  participant_id: string
  participant: {
    group_deal_id: string
    status: string
  }
  virtual_accounts: Record<string, unknown>
}

export const evaluateDepositConfirmGuard = (
  input: DepositConfirmGuardInput
): "ok" | "not_found" | "not_allowed" | "missing_va" => {
  if (input.participant.group_deal_id !== input.group_deal_id) {
    return "not_found"
  }

  if (input.participant.status === GroupDealParticipantStatus.CONFIRMED) {
    return "ok"
  }

  if (input.participant.status !== GroupDealParticipantStatus.PENDING) {
    return "not_allowed"
  }

  if (!input.virtual_accounts[input.participant_id]) {
    return "missing_va"
  }

  return "ok"
}

const mockDeals: SmokeDeal[] = [
  {
    title: "IVE EP Group Buy",
    description: "Limited photocards",
    deal_price: 18000,
    ends_at: "2026-08-01T00:00:00.000Z",
    starts_at: "2026-07-01T00:00:00.000Z",
    is_urgent_fill: true,
    metadata: { idol_group: "IVE", goods_type: "album" },
    options: [
      {
        option_type: "member",
        label: "Yujin",
        max_quantity: 2,
        current_quantity: 2,
      },
      {
        option_type: "member",
        label: "Wonyoung",
        max_quantity: 3,
        current_quantity: 1,
      },
    ],
  },
  {
    title: "NewJeans Merch Run",
    deal_price: 22000,
    ends_at: "2026-08-15T00:00:00.000Z",
    starts_at: "2026-07-10T00:00:00.000Z",
    metadata: { idol_group: "NewJeans", goods_type: "goods" },
    options: [
      {
        option_type: "member",
        label: "Minji",
        max_quantity: 5,
        current_quantity: 5,
      },
    ],
  },
]

const defaultFilters = (): SmokeFilterState => ({
  query: "",
  idolGroup: "",
  member: "",
  goodsType: "",
  favoriteMember: "",
  vacantOnly: false,
  urgentOnly: false,
  minPrice: null,
  maxPrice: null,
})

export const runPhase7SmokeChecks = (): Phase7SmokeCheck[] => {
  const checks: Phase7SmokeCheck[] = []

  const push = (id: string, label: string, pass: boolean, detail?: string) => {
    checks.push({ id, label, pass, detail })
  }

  const queryFiltered = filterGroupDeals(mockDeals, {
    ...defaultFilters(),
    query: "ive",
  })
  push(
    "participant_search",
    "Participant search/filter",
    queryFiltered.length === 1 && queryFiltered[0].title.includes("IVE")
  )

  const shortQuery = filterGroupDeals(mockDeals, {
    ...defaultFilters(),
    query: "i",
  })
  push(
    "search_min_length",
    "Search query min length (2)",
    shortQuery.length === 0
  )

  const vacantFiltered = filterGroupDeals(mockDeals, {
    ...defaultFilters(),
    favoriteMember: "Wonyoung",
    vacantOnly: true,
  })
  push(
    "favorite_member_vacancy",
    "Favorite member vacancy filter",
    vacantFiltered.length === 1 &&
      Boolean(
        vacantFiltered[0].options?.some((option) => option.label === "Wonyoung")
      )
  )

  const urgentFiltered = filterGroupDeals(mockDeals, {
    ...defaultFilters(),
    urgentOnly: true,
  })
  push(
    "urgent_fill_filter",
    "Urgent fill filter",
    urgentFiltered.length === 1 && urgentFiltered[0].is_urgent_fill === true
  )

  const referenceId = "participant:deal_01:part_01"
  const va1 = generateVirtualAccount({
    reference_id: referenceId,
    amount: 18000,
    hold_minutes: 5,
  })
  const va2 = generateVirtualAccount({
    reference_id: referenceId,
    amount: 18000,
    hold_minutes: 5,
  })
  const holdMs =
    new Date(va1.expires_at).getTime() - Date.now()
  push(
    "virtual_account_deterministic",
    "Mock virtual account generation",
    va1.account_number === va2.account_number &&
      va1.bank_code === va2.bank_code &&
      va1.amount === 18000
  )
  push(
    "seat_hold_expiry",
    "Seat hold / VA expiry (~5 min)",
    holdMs >= 4.5 * 60 * 1000 && holdMs <= 5.5 * 60 * 1000
  )

  const leaderVa = generateLeaderDepositVirtualAccount({
    group_deal_id: "deal_leader_01",
    deposit_amount: 50000,
  })
  const leaderHoldMs =
    new Date(leaderVa.expires_at).getTime() - Date.now()
  push(
    "leader_deposit_va",
    "Leader deposit VA (24h hold)",
    leaderHoldMs >= 23.5 * 60 * 60 * 1000 &&
      leaderHoldMs <= 24.5 * 60 * 60 * 1000
  )

  push(
    "deposit_confirm_pending",
    "Deposit confirm guard (pending + VA)",
    evaluateDepositConfirmGuard({
      group_deal_id: "deal_01",
      participant_id: "part_01",
      participant: {
        group_deal_id: "deal_01",
        status: GroupDealParticipantStatus.PENDING,
      },
      virtual_accounts: { part_01: va1 },
    }) === "ok"
  )
  push(
    "deposit_confirm_missing_va",
    "Deposit confirm guard (missing VA)",
    evaluateDepositConfirmGuard({
      group_deal_id: "deal_01",
      participant_id: "part_01",
      participant: {
        group_deal_id: "deal_01",
        status: GroupDealParticipantStatus.PENDING,
      },
      virtual_accounts: {},
    }) === "missing_va"
  )
  push(
    "deposit_confirm_not_allowed",
    "Deposit confirm guard (non-pending)",
    evaluateDepositConfirmGuard({
      group_deal_id: "deal_01",
      participant_id: "part_01",
      participant: {
        group_deal_id: "deal_01",
        status: GroupDealParticipantStatus.CANCELLED,
      },
      virtual_accounts: { part_01: va1 },
    }) === "not_allowed"
  )

  const receiptJob: FlaskDocumentAiJob = {
    id: "job_receipt",
    status: "completed",
    confidence: 0.92,
    extract_result_json: {
      seller: "Weverse Shop",
      order_number: "ORD-999",
      total_amount: 120000,
    },
  }
  const structuredReceipt = mapFlaskExtractToStructuredReceipt(receiptJob)
  push(
    "receipt_ai_parse",
    "Receipt document AI mapping",
    structuredReceipt?.seller === "Weverse Shop" &&
      structuredReceipt.order_number === "ORD-999"
  )

  const trackingJob: FlaskDocumentAiJob = {
    id: "job_tracking",
    status: "completed",
    confidence: 0.87,
    masked_output_url: "https://cdn.example/masked/invoice.png",
    extract_result_json: {
      invoice_rows: [
        {
          recipient_name: "Lee***",
          carrier: "CJ대한통운",
          tracking_number: "998877665544",
        },
      ],
    },
  }
  const invoiceRows = mapFlaskExtractToInvoiceRows(trackingJob)
  const aiPayload = buildDocumentAiResultPayload({
    job: trackingJob,
    invoiceRows,
    source: "flask",
  })
  push(
    "tracking_ai_parse",
    "Tracking document AI mapping",
    invoiceRows.length === 1 &&
      invoiceRows[0].tracking_number === "998877665544"
  )
  push(
    "masked_output_url",
    "Masked output URL passthrough",
    aiPayload.masked_output_url === "https://cdn.example/masked/invoice.png"
  )

  const reportDeal = {
    id: "deal_report_01",
    title: "Report Deal",
    status: GroupDealStatus.OPEN,
    deposit_status: GroupDealDepositStatus.DEPOSITED,
    deposit_amount: 50000,
    currency_code: "krw",
    current_participants: 4,
    target_quantity: 10,
    purchase_receipt_status: "verified",
    receipt_ai_status: GroupDealDocumentAiStatus.PARSED,
    receipt_ai_confidence: 0.91,
    tracking_ai_status: GroupDealDocumentAiStatus.PARSED,
    tracking_ai_confidence: 0.88,
    report_stage: "shipping",
    dispute_status: "none",
    created_at: "2026-07-01T00:00:00.000Z",
    receipt_ai_result: {
      structured_receipt: {
        seller: "Shop",
        order_number: "ORD-R1",
      },
      validation: { passed: true, reasons: [] },
    },
    tracking_ai_result: {
      auto_matched_participant_ids: ["part_a", "part_b"],
      review_conflicts: [{ reason: "AMBIGUOUS" }],
      invoice_rows: [
        { tracking_number: "111", carrier: "CJ" },
        { tracking_number: "222", carrier: "CJ" },
        { tracking_number: "333", carrier: "CJ" },
        { tracking_number: "444", carrier: "CJ" },
        { tracking_number: "555", carrier: "CJ" },
        { tracking_number: "666", carrier: "CJ" },
      ],
    },
    metadata: {},
  }

  const reportDetails = serializeAccountGroupDealReportDetails(reportDeal)
  push(
    "participant_report_serialization",
    "Participant report serialization",
    reportDetails.receipt_ai_validation?.passed === true &&
      reportDetails.tracking_ai_matched_count === 2 &&
      reportDetails.tracking_ai_conflict_count === 1 &&
      reportDetails.tracking_ai_invoice_rows.length === 5
  )

  const serializedDeal = serializeAccountGroupDeal(reportDeal)
  push(
    "leader_report_serialization",
    "Leader report serialization",
    serializedDeal.leader_stage === "recruiting" &&
      serializedDeal.receipt_ai_status === GroupDealDocumentAiStatus.PARSED &&
      serializedDeal.tracking_ai_status === GroupDealDocumentAiStatus.PARSED &&
      serializedDeal.purchase_receipt_structured?.order_number === "ORD-R1"
  )

  const settlements = buildSettlementRecords({
    hostedDeals: [
      {
        id: "deal_refund",
        title: "Refund Deal",
        deposit_status: GroupDealDepositStatus.REFUNDED,
        deposit_amount: 30000,
        currency_code: "krw",
        updated_at: "2026-07-10T00:00:00.000Z",
      },
    ],
    participations: [
      {
        participant: {
          id: "part_cancel",
          status: GroupDealParticipantStatus.CANCELLED,
          capture_payment_key: "va_stub_part_cancel",
          first_payment_amount: 15000,
          updated_at: "2026-07-11T00:00:00.000Z",
        },
        deal: {
          id: "deal_refund",
          title: "Refund Deal",
          currency_code: "krw",
        },
      },
    ],
  })

  const depositRefund = settlements.find(
    (record) => record.type === "deposit_refund"
  )
  const participantRefund = settlements.find(
    (record) => record.type === "participant_refund"
  )
  push(
    "settlement_deposit_refund",
    "Settlement deposit_refund condition",
    depositRefund?.amount === 30000 && depositRefund.status === "completed"
  )
  push(
    "settlement_participant_refund",
    "Settlement participant_refund condition",
    participantRefund?.amount === 15000 &&
      participantRefund.status === "completed"
  )

  return checks
}

export const summarizePhase7SmokeChecks = (checks: Phase7SmokeCheck[]) => {
  const passed = checks.filter((check) => check.pass).length
  const failed = checks.filter((check) => !check.pass)

  return {
    passed,
    failed: failed.length,
    total: checks.length,
    failedChecks: failed,
  }
}
