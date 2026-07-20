import { GroupDealDocumentAiStatus } from "../../types/group-buying"
import {
  buildDocumentAiResultPayload,
  mapFlaskExtractToInvoiceRows,
  mapFlaskExtractToStructuredReceipt,
  mapFlaskJobToDocumentAiStatus,
} from "../group-deal-document-ai"
import type { FlaskDocumentAiJob } from "../flask-document-ai-client"

describe("group-deal-document-ai mapping", () => {
  it("maps completed high-confidence jobs to parsed", () => {
    const status = mapFlaskJobToDocumentAiStatus({
      id: "job_1",
      status: "completed",
      confidence: 0.95,
      needs_review: false,
    })

    expect(status).toBe(GroupDealDocumentAiStatus.PARSED)
  })

  it("maps low-confidence jobs to needs_review", () => {
    const status = mapFlaskJobToDocumentAiStatus({
      id: "job_2",
      status: "completed",
      confidence: 0.5,
      needs_review: false,
    })

    expect(status).toBe(GroupDealDocumentAiStatus.NEEDS_REVIEW)
  })

  it("maps failed jobs to failed", () => {
    const status = mapFlaskJobToDocumentAiStatus({
      id: "job_3",
      status: "failed",
      confidence: null,
    })

    expect(status).toBe(GroupDealDocumentAiStatus.FAILED)
  })

  it("maps receipt extract json into structured receipt fields", () => {
    const job: FlaskDocumentAiJob = {
      id: "job_4",
      status: "completed",
      confidence: 0.91,
      extract_result_json: {
        seller: "Weverse Shop",
        order_number: "ORD-123",
        ordered_at: "2026-07-15T10:00:00.000Z",
        album_quantity: 4,
        total_amount: 152000,
      },
    }

    const structured = mapFlaskExtractToStructuredReceipt(job)

    expect(structured).toEqual({
      seller: "Weverse Shop",
      order_number: "ORD-123",
      ordered_at: "2026-07-15T10:00:00.000Z",
      album_quantity: 4,
      total_amount: 152000,
      confidence: 0.91,
    })
  })

  it("maps tracking extract json into invoice rows", () => {
    const job: FlaskDocumentAiJob = {
      id: "job_5",
      status: "completed",
      confidence: 0.88,
      extract_result_json: {
        invoice_rows: [
          {
            recipient_name: "Kim***",
            carrier: "CJ대한통운",
            tracking_number: "123456789012",
            address_hint: "Seoul***",
            confidence: 0.88,
          },
        ],
      },
    }

    const rows = mapFlaskExtractToInvoiceRows(job)

    expect(rows).toHaveLength(1)
    expect(rows[0].tracking_number).toBe("123456789012")
    expect(rows[0].carrier).toBe("CJ대한통운")
  })

  it("passes masked_output_url through document AI payload", () => {
    const job: FlaskDocumentAiJob = {
      id: "job_6",
      status: "completed",
      confidence: 0.9,
      masked_output_url: "https://cdn.example/masked/receipt.png",
    }

    const payload = buildDocumentAiResultPayload({
      job,
      source: "flask",
    })

    expect(payload.masked_output_url).toBe(
      "https://cdn.example/masked/receipt.png"
    )
  })
})
