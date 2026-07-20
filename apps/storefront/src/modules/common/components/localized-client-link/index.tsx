"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ComponentProps } from "react"

type LocalizedClientLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string
}

const LocalizedClientLink = ({
  href,
  children,
  ...props
}: LocalizedClientLinkProps) => {
  const params = useParams() as { countryCode?: string }
  const countryCode = params.countryCode ?? "kr"

  const localizedHref = (() => {
    if (!href.startsWith("/")) {
      return href
    }

    if (href === `/${countryCode}` || href.startsWith(`/${countryCode}/`)) {
      return href
    }

    return `/${countryCode}${href}`
  })()

  return (
    <Link href={localizedHref} {...props}>
      {children}
    </Link>
  )
}

export default LocalizedClientLink
