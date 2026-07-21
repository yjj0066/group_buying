"use client"

import { useActionState, useEffect, useState, startTransition } from "react"
import { useRouter } from "next/navigation"

import {
  checkNicknameAvailability,
  signupGbAppUser,
} from "@lib/data/gb-app-auth-flow"
import { formatGbAppSignupError } from "@lib/util/format-gb-app-signup-error"
import { gbAppRoutes } from "@lib/wireframe/routes"
import { useDictionary } from "@i18n/provider"
import {
  BbAlert,
  BbButton,
  BbChip,
  BbSteps,
} from "@modules/design-system"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { PreferredRole } from "types/account-group-deals"

type GbAppSignupWizardProps = {
  countryCode: string
  resume?: boolean
}

type FavoriteChip = {
  group: string
  member: string
}

type NicknameCheckState = "idle" | "checking" | "available" | "taken"

const GbAppSignupWizard = ({ countryCode, resume = false }: GbAppSignupWizardProps) => {
  const t = useDictionary()
  const auth = t.gbApp.auth
  const router = useRouter()
  const [step, setStep] = useState(resume ? 1 : 0)
  const [nickname, setNickname] = useState("")
  const [nicknameCheckState, setNicknameCheckState] =
    useState<NicknameCheckState>("idle")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [favorites, setFavorites] = useState<FavoriteChip[]>([])
  const [preferredRole, setPreferredRole] = useState<PreferredRole>("participant")
  const [localError, setLocalError] = useState<string | null>(null)
  const [requireNicknameCheckHint, setRequireNicknameCheckHint] = useState(false)
  const [message, formAction, isPending] = useActionState(signupGbAppUser, null)

  useEffect(() => {
    if (message?.state !== "success") {
      return
    }

    router.replace(gbAppRoutes.bankAccount(countryCode))
  }, [message?.state, countryCode, router])

  const primaryFavorite = favorites[0]
  const passwordMismatch =
    passwordConfirm.length > 0 && password !== passwordConfirm
  const passwordTooShort = password.length > 0 && password.length < 8

  const validateStep0 = (): string | null => {
    if (resume) {
      return null
    }

    if (!nickname.trim()) {
      return auth.step0Error
    }

    if (nicknameCheckState !== "available") {
      return auth.nicknameCheckRequired
    }

    if (!email.trim()) {
      return auth.step0Error
    }

    if (password.length < 8) {
      return auth.passwordMinLengthError
    }

    if (!passwordConfirm.trim()) {
      return auth.passwordConfirmRequiredError
    }

    if (password !== passwordConfirm) {
      return auth.passwordMismatchError
    }

    if (!agreeTerms || !agreePrivacy) {
      return auth.termsRequiredError
    }

    return null
  }

  const canProceedStep0 = validateStep0() === null
  const canProceedStep1 = favorites.length > 0

  const resolveDisplayedError = (): string | null => {
    if (localError) {
      return localError
    }

    if (message?.state === "error") {
      return formatGbAppSignupError(message.error, auth.submitError)
    }

    return null
  }

  const displayedError = resolveDisplayedError()

  const handleNicknameChange = (value: string) => {
    setNickname(value)
    setNicknameCheckState("idle")
    setRequireNicknameCheckHint(false)
    setLocalError(null)
  }

  const handleCheckNickname = async () => {
    const trimmed = nickname.trim()

    if (!trimmed) {
      setLocalError(auth.step0Error)
      return
    }

    setLocalError(null)
    setRequireNicknameCheckHint(false)
    setNicknameCheckState("checking")

    const { available } = await checkNicknameAvailability(trimmed)

    setNicknameCheckState(available ? "available" : "taken")
  }

  const handleAddFavorite = () => {
    const query = searchQuery.trim()

    if (!query) {
      return
    }

    const [group, member] = query.includes("·")
      ? query.split("·").map((part) => part.trim())
      : query.includes("/")
        ? query.split("/").map((part) => part.trim())
        : [query, query]

    if (!group || !member) {
      return
    }

    const key = `${group}-${member}`

    setFavorites((current) => {
      if (current.some((favorite) => `${favorite.group}-${favorite.member}` === key)) {
        return current
      }

      return [...current, { group, member }]
    })
    setSearchQuery("")
    setLocalError(null)
  }

  const handleRemoveFavorite = (favorite: FavoriteChip) => {
    setFavorites((current) =>
      current.filter(
        (item) =>
          item.group !== favorite.group || item.member !== favorite.member
      )
    )
  }

  const handleNext = () => {
    setLocalError(null)

    if (step === 0 && !resume) {
      const step0Error = validateStep0()

      if (step0Error) {
        if (step0Error === auth.nicknameCheckRequired) {
          setRequireNicknameCheckHint(true)
        }

        setLocalError(step0Error)
        return
      }
    }

    if (step === 1 && !canProceedStep1) {
      setLocalError(auth.step1Error)
      return
    }

    setStep((current) => Math.min(current + 1, 2))
  }

  const handleBack = () => {
    setLocalError(null)
    setStep((current) => Math.max(resume ? 1 : 0, current - 1))
  }

  const handleSubmit = () => {
    setLocalError(null)

    const step0Error = validateStep0()

    if (step0Error) {
      setStep(0)
      if (step0Error === auth.nicknameCheckRequired) {
        setRequireNicknameCheckHint(true)
      }
      setLocalError(step0Error)
      return
    }

    if (!canProceedStep1) {
      setStep(1)
      setLocalError(auth.step1Error)
      return
    }

    const form = document.getElementById("gb-app-signup-form") as HTMLFormElement | null

    if (!form) {
      return
    }

    startTransition(() => {
      formAction(new FormData(form))
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-4">
      <h1 className="text-center text-xl font-black tracking-tight bb-gradient-text">
        {auth.signupTitle}
      </h1>

      <BbSteps steps={auth.signupSteps} currentIndex={step} />

      {message?.state === "verification_required" && (
        <BbAlert variant="info">
          {t.account.register.verificationIntro}{" "}
          <strong>{message.email}</strong>
          {t.account.register.verificationOutro}
        </BbAlert>
      )}

      {(displayedError) && (
        <BbAlert variant="error">{displayedError}</BbAlert>
      )}

      <form
        id="gb-app-signup-form"
        className="flex flex-col gap-3"
        onSubmit={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key === "Enter" && step < 2) {
            event.preventDefault()
          }
        }}
      >
        <input type="hidden" name="country_code" value={countryCode} />
        {resume && <input type="hidden" name="flow_mode" value="resume" />}
        <input type="hidden" name="first_name" value={nickname.trim()} />
        <input type="hidden" name="last_name" value="-" />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="password" value={password} />
        <input type="hidden" name="phone" value="" />
        <input
          type="hidden"
          name="favorite_idol_group"
          value={primaryFavorite?.group ?? ""}
        />
        <input
          type="hidden"
          name="favorite_member"
          value={primaryFavorite?.member ?? ""}
        />
        <input type="hidden" name="preferred_role" value={preferredRole} />
        {agreeMarketing && <input type="hidden" name="agree_marketing" value="on" />}

        {step === 0 && !resume && (
          <>
            <div className="flex gap-2">
              <input
                value={nickname}
                onChange={(event) => handleNicknameChange(event.target.value)}
                placeholder={auth.nicknamePlaceholder}
                className="bb-input w-full"
                autoComplete="nickname"
                data-testid="signup-nickname-input"
              />
              <BbButton
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                isLoading={nicknameCheckState === "checking"}
                onClick={() => void handleCheckNickname()}
                data-testid="signup-nickname-check-button"
              >
                {auth.nicknameCheck}
              </BbButton>
            </div>

            {nicknameCheckState === "taken" && (
              <BbAlert variant="error">{auth.nicknameTakenError}</BbAlert>
            )}
            {nicknameCheckState === "available" && (
              <BbAlert variant="success">{auth.nicknameAvailableSuccess}</BbAlert>
            )}
            {requireNicknameCheckHint && nicknameCheckState === "idle" && (
              <BbAlert variant="error">{auth.nicknameCheckRequired}</BbAlert>
            )}

            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              required
              placeholder={auth.emailPlaceholder}
              className="bb-input w-full"
              data-testid="signup-email-input"
            />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              required
              placeholder={auth.passwordPlaceholder}
              className="bb-input w-full"
              data-testid="signup-password-input"
            />
            <input
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              type="password"
              autoComplete="new-password"
              required
              placeholder={auth.passwordConfirmPlaceholder}
              className="bb-input w-full"
              data-testid="signup-password-confirm-input"
            />

            {passwordTooShort && (
              <BbAlert variant="error">{auth.passwordMinLengthError}</BbAlert>
            )}

            {passwordMismatch && (
              <BbAlert variant="error">{auth.passwordMismatchError}</BbAlert>
            )}

            <div className="flex flex-col gap-2 pt-1 text-sm text-[var(--bb-ink)]">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(event) => setAgreeTerms(event.target.checked)}
                  data-testid="signup-agree-terms"
                />
                {auth.agreeTerms}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(event) => setAgreePrivacy(event.target.checked)}
                  data-testid="signup-agree-privacy"
                />
                {auth.agreePrivacy}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={agreeMarketing}
                  onChange={(event) => setAgreeMarketing(event.target.checked)}
                  data-testid="signup-agree-marketing"
                />
                {auth.agreeMarketing}
              </label>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm font-semibold text-[var(--bb-ink)]">
              {auth.step1Title}
            </p>
            <div className="flex gap-2">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={auth.idolSearchPlaceholder}
                className="bb-input w-full"
                data-testid="signup-idol-search-input"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    handleAddFavorite()
                  }
                }}
              />
              <BbButton
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={handleAddFavorite}
                data-testid="signup-idol-add-button"
              >
                {auth.idolAdd}
              </BbButton>
            </div>
            <div className="flex flex-wrap gap-2">
              {favorites.map((favorite) => (
                <BbChip
                  key={`${favorite.group}-${favorite.member}`}
                  active
                  onClick={() => handleRemoveFavorite(favorite)}
                >
                  {favorite.member} ×
                </BbChip>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm font-semibold text-[var(--bb-ink)]">
              {auth.step2Title}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["participant", "leader"] as const).map((role) => {
                const active = preferredRole === role

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setPreferredRole(role)}
                    className={`rounded-xl border px-3 py-4 text-sm font-semibold transition-colors ${
                      active
                        ? "border-brand-purple bg-brand-purple/10 text-brand-purple"
                        : "border-[var(--bb-line)] text-[var(--bb-ink)] hover:border-brand-purple/30"
                    }`}
                    data-testid={
                      role === "participant"
                        ? "signup-role-participant"
                        : "signup-role-leader"
                    }
                  >
                    {role === "participant"
                      ? auth.roleParticipant
                      : auth.roleLeader}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </form>

      <div className="flex flex-col gap-2">
        {step > (resume ? 1 : 0) && (
          <BbButton
            type="button"
            variant="secondary"
            fullWidth
            onClick={handleBack}
            data-testid="signup-back-button"
          >
            {auth.back}
          </BbButton>
        )}

        {step < 2 ? (
          <BbButton type="button" fullWidth onClick={handleNext}>
            {auth.next}
          </BbButton>
        ) : (
          <BbButton
            type="button"
            fullWidth
            isLoading={isPending}
            onClick={handleSubmit}
            data-testid="signup-submit-button"
          >
            {auth.signupSubmit}
          </BbButton>
        )}
      </div>

      <div className="text-center text-xs text-[var(--bb-mute)]">
        {auth.alreadyMember}{" "}
        <LocalizedClientLink
          href="/auth/login"
          className="font-semibold underline underline-offset-2 hover:text-brand-purple"
        >
          {auth.loginLink}
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default GbAppSignupWizard
