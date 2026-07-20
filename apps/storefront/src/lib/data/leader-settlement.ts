"use server"

import { revalidateTag } from "next/cache"

import type { LeaderSettlementBankAccount } from "@lib/util/leader-settlement"

export type SubmitLeaderSettlementResult =
  | {
      ok: true
      submitted_at: string
    }
  | {
      ok: false
      error: string
    }

export async function submitLeaderSettlementRequest(
  dealId: string,
  bankAccount: LeaderSettlementBankAccount
): Promise<SubmitLeaderSettlementResult> {
  if (
    !bankAccount.bankCode.trim() ||
    !bankAccount.bankName.trim() ||
    !bankAccount.accountNumber.trim() ||
    !bankAccount.accountHolder.trim()
  ) {
    return {
      ok: false,
      error: "입금 계좌 정보를 모두 입력해 주세요.",
    }
  }

  try {
    revalidateTag("group-deals")

    return {
      ok: true,
      submitted_at: new Date().toISOString(),
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[leader-settlement] Settlement submit stub accepted.",
        dealId,
        error
      )

      return {
        ok: true,
        submitted_at: new Date().toISOString(),
      }
    }

    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "정산 신청에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    }
  }
}
