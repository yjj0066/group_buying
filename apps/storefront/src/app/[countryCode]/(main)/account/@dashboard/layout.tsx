import { retrieveCustomer } from "@lib/data/customer"
import AccountLayout from "@modules/account/templates/account-layout"
import { notFound } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const customer = await retrieveCustomer()

  if (!customer) {
    notFound()
  }

  return <AccountLayout customer={customer}>{children}</AccountLayout>
}
