"use client"

import { useState } from "react"

import { updateGroupBuyingPreferences } from "@lib/data/account-group-deals"
import { useDictionary } from "@i18n/provider"
import { BbAlert } from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type { GroupBuyingPreferences } from "types/account-group-deals"

type MyNotificationsViewProps = {
  initialPreferences: GroupBuyingPreferences
}

type NotificationToggleProps = {
  id: string
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

const NotificationToggle = ({
  id,
  label,
  checked,
  disabled = false,
  onChange,
}: NotificationToggleProps) => (
  <div className="flex items-center justify-between border-b border-[#F0EEF6] py-2">
    <label htmlFor={id} className="text-sm text-[var(--bb-ink)]">
      {label}
    </label>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-4 w-7 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
        checked ? "bg-brand-purple" : "bg-[var(--bb-box)]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-3.5" : "translate-x-0.5"
        }`}
      />
    </button>
  </div>
)

const MyNotificationsView = ({
  initialPreferences,
}: MyNotificationsViewProps) => {
  const t = useDictionary()
  const prefs = t.account.preferences

  const [seatAlerts, setSeatAlerts] = useState(initialPreferences.notify_vacancy)
  const [dealProgressAlerts, setDealProgressAlerts] = useState(
    initialPreferences.notify_progress
  )
  const [paymentSettlementAlerts, setPaymentSettlementAlerts] = useState(
    initialPreferences.payment_settlement_alerts
  )
  const [marketingAlerts, setMarketingAlerts] = useState(
    initialPreferences.marketing_alerts
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const persistToggle = async (next: Partial<GroupBuyingPreferences>) => {
    setSaving(true)
    setError(null)

    try {
      await updateGroupBuyingPreferences(next)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : prefs.saveError
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        <NotificationToggle
          id="seat-alerts"
          label={prefs.notifyVacancyLabel}
          checked={seatAlerts}
          disabled={saving}
          onChange={(checked) => {
            setSeatAlerts(checked)
            void persistToggle({ notify_vacancy: checked })
          }}
        />
        {!seatAlerts && (
          <BbAlert variant="warn" className="mt-2">
            {prefs.seatAlertOffWarning}
          </BbAlert>
        )}
        <NotificationToggle
          id="deal-progress-alerts"
          label={prefs.notifyProgressLabel}
          checked={dealProgressAlerts}
          disabled={saving}
          onChange={(checked) => {
            setDealProgressAlerts(checked)
            void persistToggle({ notify_progress: checked })
          }}
        />
        <NotificationToggle
          id="payment-settlement-alerts"
          label={prefs.notifySettlementLabel}
          checked={paymentSettlementAlerts}
          disabled={saving}
          onChange={(checked) => {
            setPaymentSettlementAlerts(checked)
            void persistToggle({ payment_settlement_alerts: checked })
          }}
        />
        <NotificationToggle
          id="marketing-alerts"
          label={prefs.notifyMarketingLabel}
          checked={marketingAlerts}
          disabled={saving}
          onChange={(checked) => {
            setMarketingAlerts(checked)
            void persistToggle({ marketing_alerts: checked })
          }}
        />
      </div>

      <Text className="border-l-2 border-[var(--bb-line)] bg-[#F7F6FB] px-2 py-1 text-xs text-[var(--bb-mute)]">
        {prefs.marketingLegalNotice}
      </Text>

      {saving && (
        <Text className="text-xs text-[var(--bb-mute)]">{prefs.saving}</Text>
      )}
      {error && <BbAlert variant="error">{error}</BbAlert>}
    </div>
  )
}

export default MyNotificationsView
