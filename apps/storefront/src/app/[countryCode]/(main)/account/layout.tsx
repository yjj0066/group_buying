import { retrieveCustomer } from "@lib/data/customer"

export default async function AccountRootLayout({
  dashboard,
  login,
}: {
  dashboard: React.ReactNode
  login: React.ReactNode
}) {
  const customer = await retrieveCustomer()

  return customer ? dashboard : login
}
