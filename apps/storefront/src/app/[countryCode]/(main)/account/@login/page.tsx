import { Metadata } from "next"

import { getServerDictionary } from "@i18n/server"
import LoginTemplate from "@modules/account/templates/login-template"

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getServerDictionary()

  return {
    title: dictionary.account.meta.loginTitle,
    description: dictionary.account.meta.loginDescription,
  }
}

export default function Login() {
  return <LoginTemplate />
}
