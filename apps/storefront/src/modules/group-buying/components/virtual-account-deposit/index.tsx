"use client"

import { useEffect, useState } from "react"

import { confirmVirtualAccountDeposit } from "@lib/data/group-deals"
import { useDictionary, formatMessage } from "@i18n/provider"
import { convertToLocale } from "@lib/util/money"
import {
  BbAlert,
  BbButton,
  BbCard,
  BbTimerBanner,
  BbVirtualAccountCard,
} from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import FlaskGroupBuyPaymentLogger from "@modules/common/components/flask-behavior-logger"
import type { VirtualAccountInfo } from "types/group-deal"

type VirtualAccountDepositProps = {
  dealTitle: string
  participantId: string
  dealId: string
  fallbackAccount?: VirtualAccountInfo | null
}

const VirtualAccountDeposit = ({
  dealTitle,
  participantId,
  dealId,
  fallbackAccount = null,
}: VirtualAccountDepositProps) => {
  const t = useDictionary()
  const [account, setAccount] = useState<VirtualAccountInfo | null>(
    fallbackAccount
  )
  const [copied, setCopied] = useState<string | null>(null)
  const [depositConfirmed, setDepositConfirmed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [remainingMs, setRemainingMs] = useState(0)

  const expiresAtMs = account?.expires_at
    ? new Date(account.expires_at).getTime()
    : null

  useEffect(() => {
    if (expiresAtMs == null) {
      setRemainingMs(0)
      return
    }

    const updateRemaining = () => {
      setRemainingMs(Math.max(0, expiresAtMs - Date.now()))
    }

    updateRemaining()

    const timer = window.setInterval(updateRemaining, 1000)

    return () => window.clearInterval(timer)
  }, [expiresAtMs])

  useEffect(() => {
    if (!account || depositConfirmed || confirming) {
      return
    }

    const timer = window.setTimeout(async () => {
      setConfirming(true)

      try {
        await confirmVirtualAccountDeposit(dealId, participantId)
        setDepositConfirmed(true)
      } catch {
        // Stub confirmation may fail if already confirmed or hold expired.
      } finally {
        setConfirming(false)
      }
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [account, confirming, dealId, participantId, depositConfirmed])

  useEffect(() => {
    if (account) {
      return
    }

    const raw = sessionStorage.getItem(
      `group-deal-deposit:${dealId}:${participantId}`
    )

    if (!raw) {
      return
    }

    try {
      setAccount(JSON.parse(raw) as VirtualAccountInfo)
    } catch {
      // ignore
    }
  }, [account, dealId, participantId])

  const copyValue = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(null), 2000)
  }

  if (!account) {
    return (
      <Text className="text-ui-fg-subtle">{t.groupBuying.depositMissingAccount}</Text>
    )
  }

  if (depositConfirmed) {
    return (
      <div className="flex flex-col gap-y-6">
        <BbCard tone="gradient" className="border-emerald-200">
          <Text className="text-lg font-black text-emerald-900">
            {t.groupBuying.depositCompleteTitle}
          </Text>
          <Text className="mt-2 text-sm text-emerald-800">
            {t.groupBuying.depositCompleteDescription}
          </Text>
          <Text className="mt-4 text-sm font-bold text-emerald-900">
            {dealTitle}
          </Text>
        </BbCard>

        <LocalizedClientLink href="/participations">
          <BbButton fullWidth>{t.groupBuying.depositDoneCta}</BbButton>
        </LocalizedClientLink>
      </div>
    )
  }

  const expiresAt = account ? new Date(account.expires_at) : null
  const remainingMinutes = Math.floor(remainingMs / 60000)
  const remainingSeconds = Math.floor((remainingMs % 60000) / 1000)

  return (
    <div className="flex flex-col gap-y-6">
      <FlaskGroupBuyPaymentLogger
        group_deal_id={dealId}
        participant_id={participantId}
        payment_method="virtual_account"
        amount={account.amount}
        currency_code={account.currency_code}
      />

      <div>
        <Text className="text-sm font-black text-[var(--bb-ink)]">
          {t.groupBuying.depositTitle}
        </Text>
        <Text className="mt-1 text-sm text-[var(--bb-mute)]">{dealTitle}</Text>
      </div>

      <BbVirtualAccountCard
        bankName={account.bank_name}
        accountNumber={account.account_number}
        holder={account.account_holder}
        amountLabel={convertToLocale({
          amount: account.amount,
          currency_code: account.currency_code,
        })}
      />

      <BbButton
        type="button"
        variant="secondary"
        fullWidth
        onClick={() => copyValue("account", account.account_number)}
      >
        {copied === "account"
          ? t.groupBuying.depositCopied
          : t.groupBuying.depositCopy}
      </BbButton>

      <BbAlert variant="info">{t.groupBuying.depositAutoConfirmNotice}</BbAlert>

      {remainingMs > 0 && (
        <BbTimerBanner>
          {formatMessage(t.groupBuying.seatHoldActive, {
            minutes: String(remainingMinutes),
            seconds: String(remainingSeconds).padStart(2, "0"),
          })}
        </BbTimerBanner>
      )}

      {expiresAt && (
        <Text className="text-center text-xs text-[var(--bb-mute)]">
          {t.groupBuying.depositExpires}: {expiresAt.toLocaleString()}
        </Text>
      )}

      <LocalizedClientLink href="/participations">
        <BbButton variant="secondary" fullWidth>
          {t.groupBuying.depositDoneCta}
        </BbButton>
      </LocalizedClientLink>
    </div>
  )
}

export default VirtualAccountDeposit
