"use client"

import { Dialog, Transition } from "@headlessui/react"
import { Fragment } from "react"

import { BbButton } from "@modules/design-system"
import { Text } from "@modules/common/components/ui"

type LeaderSettlementSuccessDialogProps = {
  open: boolean
  onConfirm: () => void
  labels: {
    title: string
    message: string
    confirm: string
  }
}

const LeaderSettlementSuccessDialog = ({
  open,
  onConfirm,
  labels,
}: LeaderSettlementSuccessDialogProps) => {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={onConfirm}>
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
                <Text className="mt-3 text-sm leading-relaxed text-[var(--bb-mute)]">
                  {labels.message}
                </Text>
                <div className="mt-6">
                  <BbButton variant="cta" fullWidth onClick={onConfirm}>
                    {labels.confirm}
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

export default LeaderSettlementSuccessDialog
