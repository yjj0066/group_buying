import { HttpTypes } from "@medusajs/types"

import AccountNav from "@modules/account/components/account-nav"

type AccountLayoutProps = {
  customer: HttpTypes.StoreCustomer
  children: React.ReactNode
}

const AccountLayout = ({ customer, children }: AccountLayoutProps) => {
  return (
    <div className="content-container flex flex-col small:flex-row small:items-start py-8 small:py-12">
      <div className="w-full small:w-64 shrink-0 mb-8 small:mb-0">
        <AccountNav customer={customer} />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

export default AccountLayout
