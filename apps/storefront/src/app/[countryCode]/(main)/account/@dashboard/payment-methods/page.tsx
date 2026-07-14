import { Metadata } from "next"

import { listSavedPaymentMethods } from "@lib/data/account-group-deals"
import { getServerDictionary } from "@i18n/server"
import PaymentMethodsPanel from "@modules/account/components/payment-methods-panel"
import { Text } from "@modules/common/components/ui"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.meta.paymentMethodsTitle,
    description: dictionary.account.meta.paymentMethodsDescription,
  }
}

export default async function PaymentMethodsPage() {
  const [dictionary, methods] = await Promise.all([
    getServerDictionary(),
    listSavedPaymentMethods(),
  ])

  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h1 className="text-2xl-semi">{dictionary.account.paymentMethods.title}</h1>
        <Text className="mt-2 text-ui-fg-subtle">
          {dictionary.account.paymentMethods.description}
        </Text>
      </div>
      <PaymentMethodsPanel methods={methods} />
    </div>
  )
}
