"use client"

import { Dialog, Transition } from "@headlessui/react"
import { participateInDemandSurvey } from "@lib/data/demand-survey"
import {
  getDemandSurveyParticipantId,
  hasDemandSurveyParticipated,
  markDemandSurveyParticipated,
} from "@lib/util/demand-survey-participant"
import { useDictionary } from "@i18n/provider"
import { Button, Input, Text, clx } from "@modules/common/components/ui"
import X from "@modules/common/icons/x"
import { Fragment, useEffect, useState } from "react"

type DemandSurveyPanelProps = {
  productId: string
  open: boolean
  onClose: () => void
  onParticipated: (current: number, target: number) => void
}

const DemandSurveyPanel = ({
  productId,
  open,
  onClose,
  onParticipated,
}: DemandSurveyPanelProps) => {
  const t = useDictionary()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alreadyJoined, setAlreadyJoined] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setAlreadyJoined(hasDemandSurveyParticipated(productId))
      setSuccess(false)
      setError(null)
    }
  }, [open, productId])

  const handleParticipate = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const participantId = getDemandSurveyParticipantId(productId)
      const result = await participateInDemandSurvey(productId, {
        participant_id: participantId,
        ...(email.trim() ? { email: email.trim() } : {}),
      })

      markDemandSurveyParticipated(productId)
      setAlreadyJoined(true)
      setSuccess(true)
      onParticipated(
        result.participation_current,
        result.participation_target
      )
    } catch (participationError) {
      const message =
        participationError instanceof Error
          ? participationError.message
          : t.idol.demandSurvey.error

      if (message.toLowerCase().includes("already participated")) {
        markDemandSurveyParticipated(productId)
        setAlreadyJoined(true)
        setError(t.idol.demandSurvey.alreadyParticipated)
      } else {
        setError(t.idol.demandSurvey.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-ui-border-base bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-ui-fg-base">
                      {t.idol.demandSurvey.title}
                    </Dialog.Title>
                    <Text className="mt-2 text-sm text-ui-fg-subtle">
                      {t.idol.demandSurvey.description}
                    </Text>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full p-2 text-ui-fg-muted hover:bg-ui-bg-subtle"
                    aria-label={t.idol.demandSurvey.close}
                  >
                    <X />
                  </button>
                </div>

                {success || alreadyJoined ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <Text className="text-sm font-medium text-emerald-700">
                      {success
                        ? t.idol.demandSurvey.success
                        : t.idol.demandSurvey.alreadyParticipated}
                    </Text>
                  </div>
                ) : (
                  <div className="flex flex-col gap-y-4">
                    <div>
                      <label
                        htmlFor="demand-survey-email"
                        className="mb-2 block text-sm font-medium text-ui-fg-base"
                      >
                        {t.idol.demandSurvey.emailLabel}
                      </label>
                      <Input
                        id="demand-survey-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder={t.idol.demandSurvey.emailPlaceholder}
                      />
                      <Text className="mt-2 text-xs text-ui-fg-muted">
                        {t.idol.demandSurvey.emailOptional}
                      </Text>
                    </div>

                    {error && (
                      <Text className="text-sm text-rose-600">{error}</Text>
                    )}

                    <Button
                      onClick={handleParticipate}
                      isLoading={isSubmitting}
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting
                        ? t.idol.demandSurvey.participating
                        : t.idol.demandSurvey.participateButton}
                    </Button>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default DemandSurveyPanel
