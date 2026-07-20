"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

export type MyPageMenuItem = {
  href: string
  label: string
}

type MyPageMenuListProps = {
  items: MyPageMenuItem[]
}

const MyPageMenuList = ({ items }: MyPageMenuListProps) => {
  return (
    <nav className="flex flex-col overflow-hidden rounded-2xl border border-[var(--bb-line)] bg-white">
      {items.map((item, index) => (
        <LocalizedClientLink key={item.href} href={item.href}>
          <div
            className={`flex items-center justify-between px-4 py-3.5 text-sm font-medium text-[var(--bb-ink)] transition-colors hover:bg-[var(--bb-surface)] ${
              index < items.length - 1 ? "border-b border-[var(--bb-line)]" : ""
            }`}
          >
            <span>{item.label}</span>
            <span className="text-[var(--bb-mute)]" aria-hidden>
              ›
            </span>
          </div>
        </LocalizedClientLink>
      ))}
    </nav>
  )
}

export default MyPageMenuList
