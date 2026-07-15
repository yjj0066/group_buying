import { Dialog, Transition } from "@headlessui/react"
import { Button, clx } from "@modules/common/components/ui"
import React, { Fragment, useMemo } from "react"

import useToggleState from "@lib/hooks/use-toggle-state"
import { getProductPrice } from "@lib/util/get-product-price"
import { formatMessage, useDictionary } from "@i18n/provider"
import ChevronDown from "@modules/common/icons/chevron-down"
import X from "@modules/common/icons/x"
import OptionSelect from "./option-select"
import { HttpTypes } from "@medusajs/types"
import { isSimpleProduct } from "@lib/util/product"

type MobileActionsProps = {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  options: Record<string, string | undefined>
  updateOptions: (title: string, value: string) => void
  inStock?: boolean
  handlePrimaryAction: () => void
  isAdding?: boolean
  show: boolean
  optionsDisabled: boolean
  primaryCtaLabel: string
  isPrimaryDisabled: boolean
  participation: { current: number; target: number }
  achievementRate: number
  labels: {
    selectVariant: string
    outOfStock: string
    selectOptions: string
  }
}

const MobileActions: React.FC<MobileActionsProps> = ({
  product,
  variant,
  options,
  updateOptions,
  handlePrimaryAction,
  isAdding,
  show,
  optionsDisabled,
  primaryCtaLabel,
  isPrimaryDisabled,
  participation,
  achievementRate,
  labels,
}) => {
  const t = useDictionary()
  const { state, open, close } = useToggleState()

  const price = getProductPrice({
    product: product,
    variantId: variant?.id,
  })

  const selectedPrice = useMemo(() => {
    if (!price) {
      return null
    }
    const { variantPrice, cheapestPrice } = price

    return variantPrice || cheapestPrice || null
  }, [price])

  const isSimple = isSimpleProduct(product)

  return (
    <>
      <div
        className={clx("fixed inset-x-0 bottom-0 z-50 large:hidden", {
          "pointer-events-none": !show,
        })}
      >
        <Transition
          as={Fragment}
          show={show}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-y-3 border-t border-neutral-100 bg-white p-4 text-large-regular"
            data-testid="mobile-actions"
          >
            <div className="flex w-full items-center gap-x-2">
              <span className="line-clamp-1 flex-1" data-testid="mobile-title">
                {product.title}
              </span>
              {selectedPrice && (
                <span className="shrink-0 font-bold text-brand-pink">
                  {selectedPrice.calculated_price}
                </span>
              )}
            </div>
            <div className="w-full">
              <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
                <span>
                  {formatMessage(t.idol.participationProgress, {
                    current: participation.current.toLocaleString(),
                    target: participation.target.toLocaleString(),
                  })}
                </span>
                <span className="font-semibold text-brand-purple">
                  {formatMessage(t.products.achievementRate, {
                    percent: Math.min(achievementRate, 100),
                  })}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-pink to-brand-purple"
                  style={{ width: `${Math.min(achievementRate, 100)}%` }}
                />
              </div>
            </div>
            <div
              className={clx("grid w-full grid-cols-2 gap-x-4", {
                "!grid-cols-1": isSimple,
              })}
            >
              {!isSimple && (
                <Button
                  onClick={open}
                  variant="secondary"
                  className="w-full"
                  data-testid="mobile-actions-button"
                >
                  <div className="flex w-full items-center justify-between">
                    <span>
                      {variant
                        ? Object.values(options).join(" / ")
                        : labels.selectOptions}
                    </span>
                    <ChevronDown />
                  </div>
                </Button>
              )}
              <Button
                onClick={handlePrimaryAction}
                disabled={isPrimaryDisabled}
                variant="transparent"
                className="landing-cta-btn w-full rounded-full !font-bold !text-white"
                isLoading={isAdding}
                data-testid="mobile-cart-button"
              >
                {primaryCtaLabel}
              </Button>
            </div>
          </div>
        </Transition>
      </div>
      <Transition appear show={state} as={Fragment}>
        <Dialog as="div" className="relative z-[75]" onClose={close}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-700 bg-opacity-75 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-x-0 bottom-0">
            <div className="flex h-full min-h-full items-center justify-center text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Panel
                  className="flex h-full w-full transform flex-col gap-y-3 overflow-hidden text-left"
                  data-testid="mobile-actions-modal"
                >
                  <div className="flex w-full justify-end pr-6">
                    <button
                      onClick={close}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ui-fg-base"
                      data-testid="close-modal-button"
                    >
                      <X />
                    </button>
                  </div>
                  <div className="bg-white px-6 py-12">
                    {(product.variants?.length ?? 0) > 1 && (
                      <div className="flex flex-col gap-y-6">
                        {(product.options || []).map((option) => (
                          <div key={option.id}>
                            <OptionSelect
                              option={option}
                              current={options[option.id]}
                              updateOption={updateOptions}
                              title={option.title ?? ""}
                              disabled={optionsDisabled}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default MobileActions
