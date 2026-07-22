"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { updateGroupBuyingPreferences } from "@lib/data/account-group-deals-actions"
import { setGroupBuyingModeCookie } from "@lib/data/group-buying-mode"
import { useDictionary } from "@i18n/provider"
import { Button, Input, Label, Text } from "@modules/common/components/ui"
import type { GroupBuyingPreferences } from "types/account-group-deals"

type PreferencesFormProps = {
  initialPreferences: GroupBuyingPreferences
  isOnboarding?: boolean
}

const PreferencesForm = ({
  initialPreferences,
  isOnboarding = false,
}: PreferencesFormProps) => {
  const t = useDictionary()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [preferences, setPreferences] = useState(initialPreferences)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const updated = await updateGroupBuyingPreferences(preferences)
      setPreferences(updated)
      await setGroupBuyingModeCookie(updated.preferred_role)
      setSuccess(true)

      if (isOnboarding) {
        router.push(`/${countryCode}/account/bank-account?onboarding=1`)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.account.preferences.saveError
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-y-8">
      <section className="rounded-xl border border-ui-border-base p-5">
        <Text className="font-medium">{t.account.preferences.favoriteTitle}</Text>
        <Text className="mt-1 text-sm text-ui-fg-subtle">
          {t.account.preferences.favoriteDescription}
        </Text>

        <div className="mt-4 grid gap-4 medium:grid-cols-2">
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="favorite-idol-group">
              {t.account.preferences.idolGroupLabel}
            </Label>
            <Input
              id="favorite-idol-group"
              value={preferences.favorite_idol_group ?? ""}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  favorite_idol_group: event.target.value || null,
                }))
              }
              placeholder={t.account.preferences.idolGroupPlaceholder}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="favorite-member">
              {t.account.preferences.memberLabel}
            </Label>
            <Input
              id="favorite-member"
              value={preferences.favorite_member ?? ""}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  favorite_member: event.target.value || null,
                }))
              }
              placeholder={t.account.preferences.memberPlaceholder}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-ui-border-base p-5">
        <Text className="font-medium">{t.account.preferences.notificationsTitle}</Text>
        <Text className="mt-1 text-sm text-ui-fg-subtle">
          {t.account.preferences.notificationsDescription}
        </Text>

        <div className="mt-4 flex flex-col gap-4">
          <ToggleRow
            id="notify-vacancy"
            label={t.account.preferences.notifyVacancyLabel}
            description={t.account.preferences.notifyVacancyDescription}
            checked={preferences.notify_vacancy}
            onChange={(checked) =>
              setPreferences((current) => ({
                ...current,
                notify_vacancy: checked,
              }))
            }
          />
          <ToggleRow
            id="notify-progress"
            label={t.account.preferences.notifyProgressLabel}
            description={t.account.preferences.notifyProgressDescription}
            checked={preferences.notify_progress}
            onChange={(checked) =>
              setPreferences((current) => ({
                ...current,
                notify_progress: checked,
              }))
            }
          />
        </div>
      </section>

      <section className="rounded-xl border border-ui-border-base p-5">
        <Text className="font-medium">{t.account.preferences.roleTitle}</Text>
        <Text className="mt-1 text-sm text-ui-fg-subtle">
          {t.account.preferences.roleDescription}
        </Text>

        <div className="mt-4 inline-flex rounded-lg border border-ui-border-base p-1">
          {(["participant", "leader"] as const).map((option) => {
            const active = preferences.preferred_role === option

            return (
              <button
                key={option}
                type="button"
                onClick={() =>
                  setPreferences((current) => ({
                    ...current,
                    preferred_role: option,
                  }))
                }
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-pink text-white"
                    : "text-ui-fg-subtle hover:text-ui-fg-base"
                }`}
              >
                {option === "participant"
                  ? t.account.preferences.roleParticipant
                  : t.account.preferences.roleLeader}
              </button>
            )
          })}
        </div>
      </section>

      {error && <Text className="text-sm text-red-600">{error}</Text>}
      {success && (
        <Text className="text-sm text-emerald-700">
          {t.account.preferences.saveSuccess}
        </Text>
      )}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? t.account.preferences.saving : t.account.preferences.saveButton}
      </Button>
    </div>
  )
}

type ToggleRowProps = {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

const ToggleRow = ({
  id,
  label,
  description,
  checked,
  onChange,
}: ToggleRowProps) => {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <Text className="mt-1 text-xs text-ui-fg-subtle">{description}</Text>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-violet-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  )
}

export default PreferencesForm
