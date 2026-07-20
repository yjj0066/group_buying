"use client"

import { useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import {
  requestCustomerWithdrawal,
  saveMyProfileSettings,
} from "@lib/data/account-group-deals"
import { signout } from "@lib/data/customer"
import { useDictionary } from "@i18n/provider"
import {
  formatIdolChipLabel,
  parseIdolSearchQuery,
  readIdolInterestsFromMetadata,
  readProfileAvatarFromMetadata,
  type IdolInterest,
} from "@lib/util/idol-interests"
import ProfileWithdrawalDialog from "@modules/group-buying/components/profile-withdrawal-dialog"
import {
  BbAlert,
  BbButton,
  BbChip,
} from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type { GroupBuyingPreferences } from "types/account-group-deals"
import type { HttpTypes } from "@medusajs/types"

type MyProfileViewProps = {
  customer: HttpTypes.StoreCustomer
  initialPreferences: GroupBuyingPreferences
  hasActiveDeals: boolean
}

const CameraIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
    aria-hidden
  >
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
)

const MyProfileView = ({
  customer,
  initialPreferences,
  hasActiveDeals,
}: MyProfileViewProps) => {
  const t = useDictionary()
  const pm = t.account.profileManagement
  const { countryCode } = useParams() as { countryCode: string }
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const customerMetadata = (customer.metadata ?? null) as Record<
    string,
    unknown
  > | null

  const [nickname, setNickname] = useState(customer.first_name ?? "")
  const [email, setEmail] = useState(customer.email ?? "")
  const [avatarPreview, setAvatarPreview] = useState<string | null>(() =>
    readProfileAvatarFromMetadata(customerMetadata)
  )
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [favorites, setFavorites] = useState<IdolInterest[]>(() =>
    readIdolInterestsFromMetadata(customerMetadata, initialPreferences)
  )
  const [saving, setSaving] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [emailVerificationNotice, setEmailVerificationNotice] = useState<
    string | null
  >(null)

  const nicknameInitial =
    nickname.trim().slice(0, 1).toUpperCase() ||
    email.trim().slice(0, 1).toUpperCase() ||
    "?"

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith("image/")) {
      setError(pm.avatarInvalidType)
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null

      if (!result) {
        return
      }

      setAvatarPreview(result)
      setAvatarDataUrl(result)
      setError(null)
    }

    reader.readAsDataURL(file)
    event.target.value = ""
  }

  const handleAddFavorite = () => {
    const parsed = parseIdolSearchQuery(searchQuery)

    if (!parsed) {
      return
    }

    setFavorites((current) => {
      if (
        current.some(
          (item) =>
            item.group === parsed.group && item.member === parsed.member
        )
      ) {
        return current
      }

      return [...current, parsed]
    })
    setSearchQuery("")
  }

  const handleRemoveFavorite = (index: number) => {
    setFavorites((current) => current.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    setEmailVerificationNotice(null)

    const result = await saveMyProfileSettings({
      nickname,
      email,
      avatar_url:
        avatarDataUrl !== null
          ? avatarDataUrl
          : avatarPreview,
      idol_interests: favorites,
    })

    if (!result.ok) {
      setError(result.error)
      setSaving(false)
      return
    }

    if (result.emailVerificationRequired && result.verificationEmail) {
      setEmailVerificationNotice(
        pm.emailVerificationMessage.replace(
          "{email}",
          result.verificationEmail
        )
      )
    } else {
      setSuccess(pm.saveSuccess)
    }

    setSaving(false)
  }

  const handleLogout = async () => {
    await signout(countryCode)
  }

  const handleWithdrawClick = () => {
    if (hasActiveDeals) {
      window.alert(pm.withdrawBlockedAlert)
      return
    }

    setWithdrawOpen(true)
  }

  const handleWithdrawConfirm = async () => {
    setWithdrawing(true)
    setError(null)

    const result = await requestCustomerWithdrawal()

    if (!result.ok) {
      setError(result.error)
      setWithdrawing(false)
      return
    }

    setWithdrawOpen(false)
    setWithdrawing(false)
    await signout(countryCode)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-center">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-pink/25 to-brand-purple/25 text-xl font-black text-brand-purple">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              nicknameInitial
            )}
          </div>
          <button
            type="button"
            aria-label={pm.avatarChangeAria}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--bb-line)] bg-white text-[var(--bb-ink)] shadow-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <CameraIcon />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarSelect}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-nickname" className="text-xs font-semibold text-[var(--bb-ink)]">
          {pm.nicknameLabel}
        </label>
        <input
          id="profile-nickname"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder={pm.nicknamePlaceholder}
          autoComplete="nickname"
          className="bb-input w-full"
          data-testid="profile-nickname-input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="profile-email" className="text-xs font-semibold text-[var(--bb-ink)]">
            {pm.emailLabel}
          </label>
          <span className="text-[10px] text-[var(--bb-mute)]">
            {pm.emailReauthNote}
          </span>
        </div>
        <input
          id="profile-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={pm.emailPlaceholder}
          autoComplete="email"
          className="bb-input w-full"
          data-testid="profile-email-input"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Text className="text-xs font-semibold text-[var(--bb-ink)]">
          {pm.interestIdolsLabel}
        </Text>
        <div className="flex flex-wrap gap-2">
          {favorites.map((favorite, index) => (
            <BbChip
              key={`${favorite.group}-${favorite.member}-${index}`}
              active
              onClick={() => handleRemoveFavorite(index)}
            >
              {formatIdolChipLabel(favorite)} ×
            </BbChip>
          ))}
        </div>
        <div className="flex min-w-0 gap-2">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={pm.idolSearchPlaceholder}
            className="bb-input min-w-0 flex-1"
            data-testid="profile-idol-search-input"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                handleAddFavorite()
              }
            }}
          />
          <BbButton
            variant="secondary"
            size="sm"
            onClick={handleAddFavorite}
            data-testid="profile-idol-add-button"
          >
            {pm.idolAdd}
          </BbButton>
        </div>
      </div>

      {error && <BbAlert variant="error">{error}</BbAlert>}
      {success && (
        <Text className="text-sm text-emerald-700">{success}</Text>
      )}
      {emailVerificationNotice && (
        <BbAlert variant="warning">{emailVerificationNotice}</BbAlert>
      )}

      <BbButton
        type="button"
        fullWidth
        isLoading={saving}
        onClick={handleSave}
        data-testid="profile-save-button"
      >
        {saving ? pm.saving : pm.saveButton}
      </BbButton>

      <div className="h-px bg-[var(--bb-line)]" />

      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-[#7b78a0]">
        <button
          type="button"
          className="underline"
          onClick={() => {
            router.push(`/${countryCode}/account/forgot-password`)
          }}
        >
          {pm.changePassword}
        </button>
        <button type="button" className="underline" onClick={handleLogout}>
          {t.account.nav.logout}
        </button>
        <button
          type="button"
          className="underline disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleWithdrawClick}
        >
          {pm.withdrawAccount}
        </button>
      </div>

      {hasActiveDeals && (
        <BbAlert variant="warning">{pm.withdrawActiveDealsWarning}</BbAlert>
      )}

      <ProfileWithdrawalDialog
        open={withdrawOpen}
        onClose={() => {
          if (!withdrawing) {
            setWithdrawOpen(false)
          }
        }}
        onConfirm={handleWithdrawConfirm}
        isSubmitting={withdrawing}
        labels={{
          title: pm.withdrawConfirmTitle,
          message: pm.withdrawConfirmMessage,
          confirm: pm.withdrawConfirmButton,
          cancel: pm.withdrawCancelButton,
        }}
      />
    </div>
  )
}

export default MyProfileView
