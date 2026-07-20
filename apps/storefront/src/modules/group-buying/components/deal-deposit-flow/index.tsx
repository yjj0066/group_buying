"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import {
  cancelExpiredParticipation,
  confirmVirtualAccountDeposit,
} from "@lib/data/group-deal-participation"
import { useDictionary, formatMessage } from "@i18n/provider"
import { gbAppRoutes } from "@lib/wireframe/routes"
import {
  BbAlert,
  BbButton,
  BbTimerBanner,
  BbVirtualAccountCard,
} from "@modules/design-system"
import type { GroupDeal, VirtualAccountInfo } from "types/group-deal"
import { convertToLocale } from "@lib/util/money"

type DealDepositFlowProps = {
  deal: GroupDeal
  participantId: string
}

type DepositMeta = {
  member?: string
  recipientName?: string
  phone?: string
}

const formatHoldTime = (secondsLeft: number) => {
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

const getPhoneSuffix = (phone: string) => {
  const digits = phone.replace(/\D/g, "")
  return digits.slice(-4) || "0000"
}

const DealDepositFlow = ({ deal, participantId }: DealDepositFlowProps) => {
  const t = useDictionary()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const [virtualAccount, setVirtualAccount] = useState<VirtualAccountInfo | null>(
    null
  )
  const [depositMeta, setDepositMeta] = useState<DepositMeta>({})
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [copied, setCopied] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const expiryHandledRef = useRef(false)

  useEffect(() => {
    const raw = sessionStorage.getItem(`gb-deposit-${participantId}`)

    if (raw) {
      try {
        const parsed = JSON.parse(raw) as VirtualAccountInfo
        setVirtualAccount(parsed)

        const expiresAt = new Date(parsed.expires_at).getTime()
        const remaining = Math.max(
          0,
          Math.floor((expiresAt - Date.now()) / 1000)
        )
        setSecondsLeft(remaining)
      } catch {
        setVirtualAccount(null)
      }
    }

    const metaRaw = sessionStorage.getItem(`gb-deposit-meta-${participantId}`)

    if (metaRaw) {
      try {
        setDepositMeta(JSON.parse(metaRaw) as DepositMeta)
      } catch {
        setDepositMeta({})
      }
    }
  }, [participantId])

  useEffect(() => {
    if (!virtualAccount?.expires_at) {
      return
    }

    const expiresAtMs = new Date(virtualAccount.expires_at).getTime()

    const updateRemaining = () => {
      setSecondsLeft(
        Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000))
      )
    }

    updateRemaining()

    const timer = window.setInterval(updateRemaining, 1000)

    return () => window.clearInterval(timer)
  }, [virtualAccount?.expires_at])

  useEffect(() => {
    if (secondsLeft > 0 || !virtualAccount || expiryHandledRef.current) {
      return
    }

    expiryHandledRef.current = true
    setIsExpired(true)

    sessionStorage.removeItem(`gb-deposit-${participantId}`)
    sessionStorage.removeItem(`gb-deposit-meta-${participantId}`)

    void cancelExpiredParticipation(deal.id, participantId)

    const redirectTimer = window.setTimeout(() => {
      router.replace(gbAppRoutes.dealDepositExpired(countryCode, deal.id))
    }, 1500)

    return () => window.clearTimeout(redirectTimer)
  }, [secondsLeft, virtualAccount, deal.id, participantId, router, countryCode])

  const amountLabel = useMemo(() => {
    if (!virtualAccount) {
      return "-"
    }

    return convertToLocale({
      amount: virtualAccount.amount,
      currency_code: virtualAccount.currency_code,
    })
  }, [virtualAccount])

  const depositorName = depositMeta.recipientName?.trim() || "홍길동"
  const phoneSuffix = getPhoneSuffix(depositMeta.phone ?? "")

  const handleCopy = async () => {
    if (!virtualAccount) {
      return
    }

    await navigator.clipboard.writeText(virtualAccount.account_number)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const handleConfirmDeposit = async () => {
    if (isExpired) {
      return
    }

    setIsConfirming(true)

    try {
      await confirmVirtualAccountDeposit(deal.id, participantId)
      sessionStorage.removeItem(`gb-deposit-${participantId}`)
      sessionStorage.removeItem(`gb-deposit-meta-${participantId}`)

      const params = new URLSearchParams({
        participantId,
        confirmed: "1",
      })

      if (depositMeta.member) {
        params.set("member", depositMeta.member)
      }

      router.push(
        `${gbAppRoutes.dealComplete(countryCode, deal.id)}?${params.toString()}`
      )
    } finally {
      setIsConfirming(false)
    }
  }

  if (!virtualAccount) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <BbAlert variant="error">{t.groupBuying.depositMissingAccount}</BbAlert>
        <BbButton
          fullWidth
          onClick={() =>
            router.push(gbAppRoutes.dealApply(countryCode, deal.id))
          }
        >
          {t.groupBuying.depositExpiredReapply}
        </BbButton>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      {isExpired ? (
        <BbAlert variant="error">{t.groupBuying.depositTimeoutExpired}</BbAlert>
      ) : (
        <BbTimerBanner urgent className="flex flex-col gap-1 py-3">
          {`${t.groupBuying.depositTimeoutWarning}\n${formatMessage(
            t.groupBuying.depositTimeoutRemaining,
            { time: formatHoldTime(secondsLeft) }
          )}`}
        </BbTimerBanner>
      )}

      <BbVirtualAccountCard
        bankName={virtualAccount.bank_name}
        accountNumber={virtualAccount.account_number}
        holder={virtualAccount.account_holder}
        amountLabel={amountLabel}
        copyAccountLabel={t.groupBuying.depositCopyAccount}
        onCopyAccount={handleCopy}
      />

      {copied ? (
        <p
          role="status"
          className="rounded-xl bg-gray-900 px-4 py-2 text-center text-sm font-medium text-white"
        >
          {t.groupBuying.depositAccountCopied}
        </p>
      ) : null}

      <BbAlert variant="info">
        <p className="font-semibold text-[var(--bb-ink)]">
          {t.groupBuying.depositNameGuideTitle}
        </p>
        <p className="mt-1 whitespace-pre-line">
          {formatMessage(t.groupBuying.depositNameGuideDescription, {
            name: depositorName,
            suffix: phoneSuffix,
          })}
        </p>
      </BbAlert>

      <BbButton
        variant="cta"
        fullWidth
        isLoading={isConfirming}
        disabled={isExpired}
        onClick={handleConfirmDeposit}
      >
        {t.groupBuying.depositConfirmCta}
      </BbButton>

      {isConfirming && (
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#6B46E5]" />
          <p className="text-xs text-[#9CA3AF]">입금 확인 중...</p>
        </div>
      )}
    </div>
  )
}

export default DealDepositFlow
