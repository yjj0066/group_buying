import { I18nProvider } from "@i18n/provider"
import { getServerDictionary } from "@i18n/server"
import CheckoutNav from "@modules/checkout/components/checkout-nav"

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const dictionary = await getServerDictionary()

  return (
    <I18nProvider dictionary={dictionary}>
      <div className="w-full bg-white relative small:min-h-screen">
        <CheckoutNav />
        <div className="relative" data-testid="checkout-container">
          {children}
        </div>
      </div>
    </I18nProvider>
  )
}
