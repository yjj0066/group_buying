import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { PostStoreMeBankAccount } from "./validators"

export type RefundBankAccount = {
  bank_name: string
  bank_code: string
  account_number: string
  account_number_masked: string
  account_holder: string
  registered_at?: string | null
}

const maskAccountNumber = (accountNumber: string): string => {
  if (accountNumber.length <= 4) {
    return accountNumber
  }

  const visibleStart = accountNumber.slice(0, 2)
  const visibleEnd = accountNumber.slice(-4)
  const maskedMiddle = "*".repeat(Math.max(0, accountNumber.length - 6))

  return `${visibleStart}${maskedMiddle}${visibleEnd}`
}

const readRefundBankAccount = (
  metadata: Record<string, unknown> | null | undefined
): RefundBankAccount | null => {
  const raw = metadata?.refund_bank_account

  if (!raw || typeof raw !== "object") {
    return null
  }

  const record = raw as Record<string, unknown>

  if (
    typeof record.bank_name !== "string" ||
    typeof record.bank_code !== "string" ||
    typeof record.account_number_masked !== "string" ||
    typeof record.account_holder !== "string"
  ) {
    return null
  }

  return {
    bank_name: record.bank_name,
    bank_code: record.bank_code,
    account_number:
      typeof record.account_number === "string"
        ? record.account_number
        : record.account_number_masked,
    account_number_masked: record.account_number_masked,
    account_holder: record.account_holder,
    registered_at:
      typeof record.registered_at === "string" ? record.registered_at : null,
  }
}

const resolveCustomer = async (
  req: AuthenticatedMedusaRequest
): Promise<Record<string, unknown> | null> => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return null
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer",
    fields: ["id", "metadata"],
    filters: { id: customerId },
  })

  return (data?.[0] as Record<string, unknown> | undefined) ?? null
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customer = await resolveCustomer(req)

  if (!customer) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const metadata = (customer.metadata as Record<string, unknown> | null) ?? null

  res.json({
    bank_account: readRefundBankAccount(metadata),
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customer = await resolveCustomer(req)

  if (!customer) {
    res.status(401).json({ message: "Unauthorized" })
    return
  }

  const body = PostStoreMeBankAccount.parse(req.body)
  const metadata = {
    ...(((customer.metadata as Record<string, unknown> | null) ?? {}) as Record<
      string,
      unknown
    >),
  }

  const bankAccount: RefundBankAccount = {
    bank_name: body.bank_name,
    bank_code: body.bank_code,
    account_number: body.account_number.trim(),
    account_number_masked: maskAccountNumber(body.account_number),
    account_holder: body.account_holder,
    registered_at: new Date().toISOString(),
  }

  const customerModule = req.scope.resolve(Modules.CUSTOMER)

  await customerModule.updateCustomers(String(customer.id), {
    metadata: {
      ...metadata,
      refund_bank_account: bankAccount,
    },
  })

  res.json({
    bank_account: bankAccount,
  })
}
