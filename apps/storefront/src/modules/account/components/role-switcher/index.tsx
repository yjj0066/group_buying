"use client"

import { useState } from "react"

import { setGroupBuyingMode } from "@lib/data/group-buying-mode"
import { useDictionary } from "@i18n/provider"
import { Text } from "@modules/common/components/ui"
import type { PreferredRole } from "types/account-group-deals"

type RoleSwitcherProps = {
  initialRole: PreferredRole
}

const RoleSwitcher = ({ initialRole }: RoleSwitcherProps) => {
  const t = useDictionary()
  const [role, setRole] = useState<PreferredRole>(initialRole)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = async (nextRole: PreferredRole) => {
    if (nextRole === role) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const updated = await setGroupBuyingMode(nextRole)
      setRole(updated)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.account.roleSwitcher.saveError
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-ui-border-base p-5">
      <Text className="font-medium">{t.account.roleSwitcher.title}</Text>
      <Text className="mt-1 text-sm text-ui-fg-subtle">
        {t.account.roleSwitcher.description}
      </Text>

      <div className="mt-4 inline-flex rounded-lg border border-ui-border-base p-1">
        {(["participant", "leader"] as const).map((option) => {
          const active = role === option

          return (
            <button
              key={option}
              type="button"
              disabled={saving}
              onClick={() => handleChange(option)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-pink text-white"
                  : "text-ui-fg-subtle hover:text-ui-fg-base"
              }`}
            >
              {option === "participant"
                ? t.account.roleSwitcher.participant
                : t.account.roleSwitcher.leader}
            </button>
          )
        })}
      </div>

      {error && <Text className="mt-2 text-sm text-red-600">{error}</Text>}
    </section>
  )
}

export default RoleSwitcher
