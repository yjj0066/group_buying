"use client"

import GbAppLoginForm from "@modules/group-buying/components/gb-app-login-form"
import GbAppSignupWizard from "@modules/group-buying/components/gb-app-signup-wizard"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import { resolveCountryCode } from "@lib/util/country-code"
import { useParams } from "next/navigation"

type GbAppAuthTemplateProps = {
  initialView?: LOGIN_VIEW
}

/** @deprecated Use GbAppLoginForm / GbAppSignupWizard on dedicated auth pages. */
const GbAppAuthTemplate = ({
  initialView = LOGIN_VIEW.SIGN_IN,
}: GbAppAuthTemplateProps) => {
  const { countryCode } = useParams() as { countryCode: string }
  const cc = resolveCountryCode(countryCode)

  if (initialView === LOGIN_VIEW.REGISTER) {
    return <GbAppSignupWizard countryCode={cc} />
  }

  return <GbAppLoginForm countryCode={cc} />
}

export default GbAppAuthTemplate
