/**
 * [ACCT] 환급·정산 계좌 등록
 * Wireframe ID: ACCT | 도메인: 공통·인증 | 우선순위: P0
 */
import { requireCustomerForGbApp } from "@lib/data/group-deal-pages"
import GbAppBankAccountForm from "@modules/group-buying/components/gb-app-bank-account-form"
import { resolveCountryCode } from "@lib/util/country-code"

type BankAccountPageProps = {
  params: Promise<{ countryCode: string }>
}

export default async function BankAccountPage({ params }: BankAccountPageProps) {
  const { countryCode } = await params
  const cc = resolveCountryCode(countryCode)

  const customer = await requireCustomerForGbApp(cc)

  return (
    <GbAppBankAccountForm
      countryCode={cc}
      expectedAccountHolder={customer.first_name}
    />
  )
}
