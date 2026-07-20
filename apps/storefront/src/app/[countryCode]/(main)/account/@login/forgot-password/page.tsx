import { Metadata } from "next"

import { getServerDictionary } from "@i18n/server"
import ForgotPasswordForm from "@modules/account/components/forgot-password-form"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.forgotPassword.title,
    description: dictionary.account.forgotPassword.description,
  }
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex justify-center py-12">
      <ForgotPasswordForm />
    </div>
  )
}
