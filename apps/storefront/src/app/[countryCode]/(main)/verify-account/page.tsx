import { Metadata } from "next"
import { Suspense } from "react"

import { getServerDictionary } from "@i18n/server"
import VerifyAccount from "@modules/account/components/verify-account"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.meta.verifyTitle,
    description: dictionary.account.meta.verifyDescription,
  }
}

export default async function VerifyAccountPage() {
  const dictionary = await getServerDictionary()

  return (
    <div className="w-full flex justify-center px-8 py-12">
      <Suspense
        fallback={
          <p className="text-base-regular text-ui-fg-base">
            {dictionary.account.verify.verifying}
          </p>
        }
      >
        <VerifyAccount />
      </Suspense>
    </div>
  )
}
