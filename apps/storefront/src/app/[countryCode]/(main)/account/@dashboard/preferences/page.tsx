import { Metadata } from "next"

import { retrieveGroupBuyingPreferences } from "@lib/data/account-group-deals"
import { getServerDictionary } from "@i18n/server"
import PreferencesForm from "@modules/account/components/preferences-form"
import { Text } from "@modules/common/components/ui"

type Props = {
  searchParams: Promise<{ onboarding?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.meta.preferencesTitle,
    description: dictionary.account.meta.preferencesDescription,
  }
}

export default async function PreferencesPage(props: Props) {
  const searchParams = await props.searchParams
  const [dictionary, preferences] = await Promise.all([
    getServerDictionary(),
    retrieveGroupBuyingPreferences(),
  ])

  const isOnboarding = searchParams.onboarding === "1"

  return (
    <div className="flex flex-col gap-y-6">
      {isOnboarding && (
        <div className="rounded-xl border border-brand-pink/30 bg-rose-50/60 p-4">
          <Text className="text-sm font-medium text-brand-pink">
            {dictionary.account.preferences.onboardingBanner}
          </Text>
        </div>
      )}
      <div>
        <h1 className="text-2xl-semi">{dictionary.account.preferences.title}</h1>
        <Text className="mt-2 text-ui-fg-subtle">
          {isOnboarding
            ? dictionary.account.preferences.onboardingDescription
            : dictionary.account.preferences.description}
        </Text>
      </div>
      <PreferencesForm initialPreferences={preferences} isOnboarding={isOnboarding} />
    </div>
  )
}
