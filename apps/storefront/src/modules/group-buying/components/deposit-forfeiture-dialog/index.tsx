"use client"

import { Dialog, Transition } from "@headlessui/react"
import { Fragment } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { BbButton } from "@modules/design-system"
import { Text } from "@modules/common/components/ui"
import type { SettlementRecord } from "types/account-group-deals"

type DepositForfeitureDialogProps = {
  open: boolean
  onClose: () => void
  record: SettlementRecord | null
  objectionHref: string | null
  labels: {
    title: string
    dealLabel: string
    reasonLabel: string
    close: string
    objection: string
  }
}

const DepositForfeitureDialog = ({
  open,
  onClose,
  record,
  objectionHref,
  labels,
}: DepositForfeitureDialogProps) => {
  if (!record) {
    return null
  }

  const reason =
    record.forfeiture_reason?.trim() ||
    record.description?.trim() ||
    "-"

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
          <div className="fixed inset-0 bg-black/40" />
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
              <Dialog.Panel className="w-full max-w-sm rounded-2xl border border-[var(--bb-line)] bg-white p-6 shadow-xl">
                <Dialog.Title className="text-base font-black text-[var(--bb-ink)]">
                  {labels.title}
                </Dialog.Title>

                <div className="mt-4 flex flex-col gap-3">
                  <div>
                    <Text className="text-[10px] font-bold uppercase tracking-wide text-[var(--bb-mute)]">
                      {labels.dealLabel}
                    </Text>
                    <Text className="mt-1 text-sm text-[var(--bb-ink)]">
                      {record.group_deal_title}
                    </Text>
                  </div>

                  <div>
                    <Text className="text-[10px] font-bold uppercase tracking-wide text-[var(--bb-mute)]">
                      {labels.reasonLabel}
                    </Text>
                    <Text className="mt-1 text-sm leading-relaxed text-[var(--bb-mute)]">
                      {reason}
                    </Text>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  {objectionHref ? (
                    <LocalizedClientLink href={objectionHref}>
                      <BbButton variant="cta" fullWidth>
                        {labels.objection}
                      </BbButton>
                    </LocalizedClientLink>
                  ) : null}
                  <BbButton variant="secondary" fullWidth onClick={onClose}>
                    {labels.close}
                  </BbButton>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default DepositForfeitureDialog
