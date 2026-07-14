import { Metadata } from "next"

import { retrieveGroupBuyingPreferences } from "@lib/data/account-group-deals"
import { getServerDictionary } from "@i18n/server"
import PreferencesForm from "@modules/account/components/preferences-form"
import { Text } from "@modules/common/components/ui"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.meta.preferencesTitle,
    description: dictionary.account.meta.preferencesDescription,
  }
}

export default async function PreferencesPage() {
  const [dictionary, preferences] = await Promise.all([
    getServerDictionary(),
    retrieveGroupBuyingPreferences(),
  ])

  return (
    <div className="flex flex-col gap-y-6">
      <div>
        <h1 className="text-2xl-semi">{dictionary.account.preferences.title}</h1>
        <Text className="mt-2 text-ui-fg-subtle">
          {dictionary.account.preferences.description}
        </Text>
      </div>
      <PreferencesForm initialPreferences={preferences} />
    </div>
  )
}
