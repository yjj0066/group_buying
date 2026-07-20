"use client"

import { useParams } from "next/navigation"

import { gbAppRoutes } from "@lib/wireframe/routes"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { BbButton } from "@modules/design-system"

type MyPageBackLinkProps = {
  label?: string
}

const MyPageBackLink = ({ label = "← 마이페이지" }: MyPageBackLinkProps) => {
  const { countryCode } = useParams() as { countryCode: string }

  return (
    <LocalizedClientLink href={gbAppRoutes.my(countryCode)}>
      <BbButton variant="secondary" size="sm">
        {label}
      </BbButton>
    </LocalizedClientLink>
  )
}

export default MyPageBackLink
