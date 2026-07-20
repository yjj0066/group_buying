import { Metadata } from "next"

import { redirect } from "next/navigation"



import {

  getBankAccount,

  listHostedGroupDeals,

  listMyParticipations,

} from "@lib/data/account-group-deals"

import { retrieveCustomer } from "@lib/data/customer"

import { getServerDictionary } from "@i18n/server"

import { resolveCountryCode } from "@lib/util/country-code"
import { hasActiveGroupDeals } from "@lib/util/group-deal-activity"

import MyAccountView from "@modules/group-buying/components/my-account-view"

import { Text } from "@modules/common/components/ui"



export async function generateMetadata(): Promise<Metadata> {

  const dictionary = await getServerDictionary()



  return {

    title: dictionary.account.meta.bankAccountTitle,

    description: dictionary.account.meta.bankAccountDescription,

  }

}



export default async function BankAccountPage(props: {

  params: Promise<{ countryCode: string }>

  searchParams: Promise<{ onboarding?: string }>

}) {

  const params = await props.params

  const searchParams = await props.searchParams

  const countryCode = resolveCountryCode(params.countryCode)

  const isOnboarding = searchParams.onboarding === "1"



  const [dictionary, customer, bankAccount, hostedDeals, participations] =

    await Promise.all([

      getServerDictionary(),

      retrieveCustomer(),

      getBankAccount(),

      listHostedGroupDeals(),

      listMyParticipations(),

    ])



  if (!customer) {

    redirect(`/${countryCode}/account`)

  }



  const t = dictionary.account.bankAccount



  const hasActiveDeals = hasActiveGroupDeals(hostedDeals, participations)



  return (

    <div className="flex flex-col gap-y-6">

      {isOnboarding && (

        <div className="rounded-xl border border-brand-pink/30 bg-rose-50/60 p-4">

          <Text className="text-sm font-medium text-brand-pink">

            {t.onboardingBanner}

          </Text>

        </div>

      )}

      <div>

        <h1 className="text-2xl-semi">{t.title}</h1>

        <Text className="mt-2 text-ui-fg-subtle">

          {isOnboarding ? t.onboardingDescription : t.description}

        </Text>

      </div>

      <MyAccountView

        initialAccount={bankAccount}

        hasActiveDeals={hasActiveDeals}

        startInEditMode={isOnboarding && !bankAccount}

      />

    </div>

  )

}

