"use server"



import { sdk } from "@lib/config"

import { getAuthHeaders } from "@lib/data/cookies"

import { FetchError } from "@medusajs/js-sdk"

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



const resolveSettlementSubmitError = (error: unknown): string => {

  if (error instanceof FetchError) {

    if (error.status === 401) {

      return "세션이 만료되었습니다. 다시 로그인한 뒤 시도해 주세요."

    }



    const message = error.message || error.statusText



    if (message) {

      return message.endsWith(".") ? message : `${message}.`

    }

  }



  if (error instanceof Error && error.message) {

    return error.message.endsWith(".")

      ? error.message

      : `${error.message}.`

  }



  return "정산 신청에 실패했습니다. 잠시 후 다시 시도해 주세요."

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

    const headers = await getAuthHeaders()



    if (!("authorization" in headers) || !headers.authorization) {

      return {

        ok: false,

        error: "로그인이 필요합니다. 계정에 로그인한 뒤 다시 시도해 주세요.",

      }

    }



    const response = await sdk.client.fetch<{ submitted_at: string }>(

      `/store/me/group-deals/${dealId}/settlement`,

      {

        method: "POST",

        headers,

        body: {

          bank_code: bankAccount.bankCode.trim(),

          bank_name: bankAccount.bankName.trim(),

          account_number: bankAccount.accountNumber.trim(),

          account_holder: bankAccount.accountHolder.trim(),

        },

      }

    )



    revalidateTag("group-deals")



    return {

      ok: true,

      submitted_at: response.submitted_at ?? new Date().toISOString(),

    }

  } catch (error) {

    if (process.env.NODE_ENV === "development") {

      console.warn("[leader-settlement] Settlement submit failed.", dealId, error)

    }



    return {

      ok: false,

      error: resolveSettlementSubmitError(error),

    }

  }

}

