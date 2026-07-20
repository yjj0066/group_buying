import { Metadata } from "next"

import { getServerDictionary } from "@i18n/server"
import { Text } from "@modules/common/components/ui"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.customerService.title,
    description: dictionary.account.customerService.description,
  }
}

export default async function CustomerServicePage() {
  const dictionary = await getServerDictionary()
  const t = dictionary.account.customerService

  return (
    <div className="flex flex-col gap-y-8">
      <div>
        <h1 className="text-2xl-semi">{t.title}</h1>
        <Text className="mt-2 text-ui-fg-subtle">{t.description}</Text>
      </div>

      <section className="rounded-xl border border-ui-border-base p-5">
        <Text className="font-medium">{t.faqTitle}</Text>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-ui-fg-subtle">
          {t.faqItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-ui-border-base p-5">
        <Text className="font-medium">{t.inquiryTitle}</Text>
        <Text className="mt-2 text-sm text-ui-fg-subtle">{t.inquiryDescription}</Text>
        <Text className="mt-3 text-sm text-ui-fg-muted">
          support@idolgroupbuy.example
        </Text>
      </section>

      <section className="rounded-xl border border-ui-border-base p-5">
        <Text className="font-medium">{t.disputeTitle}</Text>
        <Text className="mt-2 text-sm text-ui-fg-subtle">{t.disputeDescription}</Text>
        <Text className="mt-3 text-sm font-medium text-ui-fg-base">{t.disputeCta}</Text>
      </section>
    </div>
  )
}
