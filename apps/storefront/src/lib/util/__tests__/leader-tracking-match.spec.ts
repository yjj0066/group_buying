import {
  applyManualTrackingPatch,
  buildParticipantManualRows,
  compactMatchRowsForState,
  mergeInvoiceRowsIntoMatchTable,
  mergeParticipantMatchRows,
} from "@lib/util/leader-tracking-match"
import type { LeaderShippingParticipantRow } from "@lib/util/leader-shipping-tracking"

const participants: LeaderShippingParticipantRow[] = [
  {
    participantId: "p1",
    recipientName: "명륜이",
    phone: "010-1111-1111",
    address: "03063 서울 종로구 성균관로 25",
    memberLabel: "A",
    assignedQuantity: 1,
  },
  {
    participantId: "p2",
    recipientName: "명륜이",
    phone: "010-2222-2222",
    address: "16419 경기 수원시 장안구 서부로 2066",
    memberLabel: "B",
    assignedQuantity: 1,
  },
  {
    participantId: "p3",
    recipientName: "호걸이",
    phone: "010-3333-3333",
    address: "03063 서울 종로구",
    memberLabel: "C",
    assignedQuantity: 1,
  },
  {
    participantId: "p4",
    recipientName: "호암관",
    phone: "010-4444-4444",
    address: "03063 서울 종로구 성균관로 25",
    memberLabel: "D",
    assignedQuantity: 1,
  },
]

describe("leader-tracking-match review reasons", () => {
  it("marks duplicate participant names as ambiguous when unmatched", () => {
    const rows = buildParticipantManualRows(participants, [])

    expect(rows[0].reviewReasons).toContain("ambiguous_participant")
    expect(rows[1].reviewReasons).toContain("ambiguous_participant")
  })

  it("matches same-initial names separately when full names differ", () => {
    const merged = mergeInvoiceRowsIntoMatchTable(participants, [
      {
        recipient_name: "호걸이",
        tracking_number: "111111111111",
        carrier: "CJ대한통운",
        confidence: 0.9,
        needs_review: false,
      },
      {
        recipient_name: "호암관",
        tracking_number: "222222222222",
        carrier: "CJ대한통운",
        confidence: 0.9,
        needs_review: false,
      },
    ])

    expect(merged.find((row) => row.participantId === "p3")?.status).toBe(
      "complete"
    )
    expect(merged.find((row) => row.participantId === "p4")?.status).toBe(
      "complete"
    )
  })

  it("disambiguates duplicate names using address_hint", () => {
    const merged = mergeInvoiceRowsIntoMatchTable(participants, [
      {
        recipient_name: "명륜이",
        address_hint: "03063 서울 종로구",
        tracking_number: "111111111111",
        carrier: "CJ대한통운",
        confidence: 0.9,
        needs_review: false,
      },
      {
        recipient_name: "명륜이",
        address_hint: "16419 경기 수원",
        tracking_number: "222222222222",
        carrier: "CJ대한통운",
        confidence: 0.9,
        needs_review: false,
      },
    ])

    expect(merged.find((row) => row.participantId === "p1")?.trackingNumber).toBe(
      "111111111111"
    )
    expect(merged.find((row) => row.participantId === "p2")?.trackingNumber).toBe(
      "222222222222"
    )
  })

  it("copies manual tracking to duplicate participant profiles", () => {
    const duplicateParticipants: LeaderShippingParticipantRow[] = [
      {
        participantId: "d1",
        recipientName: "명륜이",
        phone: "010-1111-1111",
        address: "03063 서울",
        memberLabel: "A",
        assignedQuantity: 1,
      },
      {
        participantId: "d2",
        recipientName: "명륜이",
        phone: "010-1111-1111",
        address: "03063 서울",
        memberLabel: "B",
        assignedQuantity: 1,
      },
    ]

    const base = mergeParticipantMatchRows(duplicateParticipants, [])
    const updated = applyManualTrackingPatch(
      base,
      "d1",
      { carrier: "CJ대한통운", trackingNumber: "123456789012" },
      duplicateParticipants
    )

    expect(updated.find((row) => row.participantId === "d1")?.status).toBe(
      "complete"
    )
    expect(updated.find((row) => row.participantId === "d2")?.trackingNumber).toBe(
      "123456789012"
    )
  })

  it("still applies AI matches after manual courier edits", () => {
    const manualState = compactMatchRowsForState(
      applyManualTrackingPatch(
        mergeParticipantMatchRows(participants, []),
        "p3",
        { carrier: "롯데택배" },
        participants
      )
    )

    const merged = mergeInvoiceRowsIntoMatchTable(
      participants,
      [
        {
          recipient_name: "호걸이",
          tracking_number: "333333333333",
          carrier: "CJ대한통운",
          confidence: 0.9,
          needs_review: false,
        },
      ],
      manualState
    )

    expect(merged.find((row) => row.participantId === "p3")?.trackingNumber).toBe(
      "333333333333"
    )
  })
})
