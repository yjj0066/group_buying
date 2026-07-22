"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import type { HttpTypes } from "@medusajs/types"

import { createHostedGroupDeal, recordLeaderDeposit } from "@lib/data/account-group-deals-actions"
import { formatMessage } from "@i18n/provider"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button, Text } from "@modules/common/components/ui"

const DEPOSIT_RATE = 0.1
const DEPOSIT_MIN = 30_000
const DEPOSIT_MAX = 300_000

const calculateDeposit = (dealPrice: number, targetQuantity: number) => {
  const total = dealPrice * targetQuantity
  const raw = Math.round(total * DEPOSIT_RATE)

  return Math.min(DEPOSIT_MAX, Math.max(DEPOSIT_MIN, raw))
}

const defaultStartsAt = () => {
  const date = new Date()
  date.setMinutes(0, 0, 0)
  return date.toISOString().slice(0, 16)
}

const defaultEndsAt = () => {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  date.setMinutes(0, 0, 0)
  return date.toISOString().slice(0, 16)
}

const toIsoDateTime = (value: string) => {
  return new Date(value).toISOString()
}

const resolveVariantPrice = (
  variant: HttpTypes.StoreProductVariant | undefined,
  currencyCode: string
) => {
  const calculated = variant?.calculated_price

  if (
    calculated &&
    calculated.currency_code?.toLowerCase() === currencyCode.toLowerCase()
  ) {
    return calculated.calculated_amount ?? calculated.original_amount ?? null
  }

  return null
}

export type GroupDealCreateFormLabels = {
  stepInfo: string
  stepPricing: string
  stepDeposit: string
  titleLabel: string
  titlePlaceholder: string
  descriptionLabel: string
  descriptionPlaceholder: string
  productLabel: string
  productPlaceholder: string
  noProducts: string
  noProductsHint: string
  variantLabel: string
  variantPlaceholder: string
  minParticipantsLabel: string
  targetQuantityLabel: string
  declaredAlbumQuantityLabel: string
  maxQuantityLabel: string
  originalPriceLabel: string
  dealPriceLabel: string
  currencyLabel: string
  startsAtLabel: string
  endsAtLabel: string
  depositTitle: string
  depositDescription: string
  depositAmount: string
  depositPending: string
  depositRefundNote: string
  depositStubNote: string
  next: string
  back: string
  submit: string
  submitting: string
  cancel: string
  createError: string
  requiredFields: string
}

type GroupDealCreateFormProps = {
  products: HttpTypes.StoreProduct[]
  currencyCode: string
  labels: GroupDealCreateFormLabels
}

const GroupDealCreateForm = ({
  products,
  currencyCode,
  labels,
}: GroupDealCreateFormProps) => {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [productId, setProductId] = useState("")
  const [variantId, setVariantId] = useState("")
  const [minParticipants, setMinParticipants] = useState("10")
  const [targetQuantity, setTargetQuantity] = useState("100")
  const [declaredAlbumQuantity, setDeclaredAlbumQuantity] = useState("100")
  const [maxQuantity, setMaxQuantity] = useState("100")
  const [originalPrice, setOriginalPrice] = useState("")
  const [dealPrice, setDealPrice] = useState("")
  const [startsAt, setStartsAt] = useState(defaultStartsAt)
  const [endsAt, setEndsAt] = useState(defaultEndsAt)

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId),
    [products, productId]
  )

  const depositAmount = useMemo(() => {
    const price = Number(dealPrice)
    const quantity = Number(targetQuantity)

    if (!Number.isFinite(price) || !Number.isFinite(quantity) || price <= 0) {
      return 0
    }

    return calculateDeposit(price, quantity)
  }, [dealPrice, targetQuantity])

  const handleProductChange = (nextProductId: string) => {
    setProductId(nextProductId)

    const product = products.find((item) => item.id === nextProductId)
    const firstVariant = product?.variants?.[0]

    if (!firstVariant) {
      setVariantId("")
      return
    }

    setVariantId(firstVariant.id)

    const price = resolveVariantPrice(firstVariant, currencyCode)

    if (price != null) {
      setOriginalPrice(String(price))
      if (!dealPrice) {
        setDealPrice(String(price))
      }
    }
  }

  const handleVariantChange = (nextVariantId: string) => {
    setVariantId(nextVariantId)

    const variant = selectedProduct?.variants?.find(
      (item) => item.id === nextVariantId
    )
    const price = resolveVariantPrice(variant, currencyCode)

    if (price != null) {
      setOriginalPrice(String(price))
    }
  }

  const validateStep1 = () => {
    if (!title.trim() || !productId) {
      setError(labels.requiredFields)
      return false
    }

    const variants = selectedProduct?.variants ?? []

    if (variants.length > 0 && !variantId) {
      setError(labels.requiredFields)
      return false
    }

    setError(null)
    return true
  }

  const validateStep2 = () => {
    const min = Number(minParticipants)
    const target = Number(targetQuantity)
    const declared = Number(declaredAlbumQuantity)
    const max = Number(maxQuantity)
    const original = Number(originalPrice)
    const deal = Number(dealPrice)

    if (
      !Number.isFinite(min) ||
      min <= 0 ||
      !Number.isFinite(target) ||
      target <= 0 ||
      !Number.isFinite(declared) ||
      declared <= 0 ||
      !Number.isFinite(max) ||
      max <= 0 ||
      !Number.isFinite(original) ||
      original <= 0 ||
      !Number.isFinite(deal) ||
      deal <= 0
    ) {
      setError(labels.requiredFields)
      return false
    }

    if (new Date(endsAt) <= new Date(startsAt)) {
      setError(labels.createError)
      return false
    }

    setError(null)
    return true
  }

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) {
      setStep(validateStep1() ? 2 : 1)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const resolvedVariantId =
        variantId || selectedProduct?.variants?.[0]?.id || null

      const groupDeal = await createHostedGroupDeal({
        title: title.trim(),
        description: description.trim() || null,
        product_id: productId,
        variant_id: resolvedVariantId,
        min_participants: Number(minParticipants),
        target_quantity: Number(targetQuantity),
        declared_album_quantity: Number(declaredAlbumQuantity),
        max_quantity: Number(maxQuantity),
        original_price: Number(originalPrice),
        deal_price: Number(dealPrice),
        currency_code: currencyCode.toUpperCase(),
        starts_at: toIsoDateTime(startsAt),
        ends_at: toIsoDateTime(endsAt),
      })

      await recordLeaderDeposit(groupDeal.id, {
        deposit_amount: depositAmount,
        deposit_payment_key: `leader-deposit-stub:${groupDeal.id}`,
      })

      router.push(`/${countryCode}/group-buying/${groupDeal.id}`)
      router.refresh()
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : labels.createError
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!products.length) {
    return (
      <div className="rounded-xl border border-dashed border-ui-border-base p-10 text-center">
        <Text className="text-ui-fg-subtle">{labels.noProducts}</Text>
        <Text className="mt-2 text-sm text-ui-fg-muted">{labels.noProductsHint}</Text>
        <LocalizedClientLink href="/store">
          <Button variant="secondary" className="mt-4">
            {labels.productPlaceholder}
          </Button>
        </LocalizedClientLink>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-6" data-testid="group-deal-create-form">
      <div className="flex gap-2">
        {[labels.stepInfo, labels.stepPricing, labels.stepDeposit].map(
          (label, index) => {
            const stepNumber = index + 1
            const active = step === stepNumber

            return (
              <button
                key={label}
                type="button"
                onClick={() => setStep(stepNumber)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  active
                    ? "border-brand-pink bg-brand-pink/5 font-semibold text-brand-pink"
                    : "border-ui-border-base text-ui-fg-subtle"
                }`}
              >
                {stepNumber}. {label}
              </button>
            )
          }
        )}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-y-4">
          <label className="flex flex-col gap-y-2">
            <span className="text-sm font-medium">{labels.titleLabel}</span>
            <input
              className="rounded-lg border border-ui-border-base px-3 py-2"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={labels.titlePlaceholder}
              required
            />
          </label>

          <label className="flex flex-col gap-y-2">
            <span className="text-sm font-medium">{labels.descriptionLabel}</span>
            <textarea
              className="min-h-24 rounded-lg border border-ui-border-base px-3 py-2"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={labels.descriptionPlaceholder}
            />
          </label>

          <label className="flex flex-col gap-y-2">
            <span className="text-sm font-medium">{labels.productLabel}</span>
            <select
              className="rounded-lg border border-ui-border-base px-3 py-2"
              value={productId}
              onChange={(event) => handleProductChange(event.target.value)}
            >
              <option value="">{labels.productPlaceholder}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title}
                </option>
              ))}
            </select>
          </label>

          {selectedProduct && (
            <label className="flex flex-col gap-y-2">
              <span className="text-sm font-medium">{labels.variantLabel}</span>
              <select
                className="rounded-lg border border-ui-border-base px-3 py-2"
                value={variantId}
                onChange={(event) => handleVariantChange(event.target.value)}
                required
              >
                {(selectedProduct.variants?.length ?? 0) > 1 && (
                  <option value="">{labels.variantPlaceholder}</option>
                )}
                {selectedProduct.variants?.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 gap-4 small:grid-cols-2">
          <label className="flex flex-col gap-y-2">
            <span className="text-sm font-medium">{labels.minParticipantsLabel}</span>
            <input
              type="number"
              min={1}
              className="rounded-lg border border-ui-border-base px-3 py-2"
              value={minParticipants}
              onChange={(event) => setMinParticipants(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-y-2">
            <span className="text-sm font-medium">{labels.targetQuantityLabel}</span>
            <input
              type="number"
              min={1}
              className="rounded-lg border border-ui-border-base px-3 py-2"
              value={targetQuantity}
              onChange={(event) => {
                setTargetQuantity(event.target.value)
                if (!declaredAlbumQuantity || declaredAlbumQuantity === targetQuantity) {
                  setDeclaredAlbumQuantity(event.target.value)
                }
              }}
            />
          </label>

          <label className="flex flex-col gap-y-2">
            <span className="text-sm font-medium">{labels.declaredAlbumQuantityLabel}</span>
            <input
              type="number"
              min={1}
              className="rounded-lg border border-ui-border-base px-3 py-2"
              value={declaredAlbumQuantity}
              onChange={(event) => setDeclaredAlbumQuantity(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-y-2">
            <span className="text-sm font-medium">{labels.maxQuantityLabel}</span>
            <input
              type="number"
              min={1}
              className="rounded-lg border border-ui-border-base px-3 py-2"
              value={maxQuantity}
              onChange={(event) => setMaxQuantity(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-y-2">
            <span className="text-sm font-medium">{labels.currencyLabel}</span>
            <input
              className="rounded-lg border border-ui-border-base px-3 py-2 uppercase"
              value={currencyCode}
              readOnly
            />
          </label>

          <label className="flex flex-col gap-y-2">
            <span className="text-sm font-medium">{labels.originalPriceLabel}</span>
            <input
              type="number"
              min={1}
              className="rounded-lg border border-ui-border-base px-3 py-2"
              value={originalPrice}
              onChange={(event) => setOriginalPrice(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-y-2">
            <span className="text-sm font-medium">{labels.dealPriceLabel}</span>
            <input
              type="number"
              min={1}
              className="rounded-lg border border-ui-border-base px-3 py-2"
              value={dealPrice}
              onChange={(event) => setDealPrice(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-y-2">
            <span className="text-sm font-medium">{labels.startsAtLabel}</span>
            <input
              type="datetime-local"
              className="rounded-lg border border-ui-border-base px-3 py-2"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-y-2">
            <span className="text-sm font-medium">{labels.endsAtLabel}</span>
            <input
              type="datetime-local"
              className="rounded-lg border border-ui-border-base px-3 py-2"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-6">
          <h2 className="text-lg font-semibold">{labels.depositTitle}</h2>
          <Text className="mt-2 text-ui-fg-subtle">{labels.depositDescription}</Text>
          <p className="mt-4 text-2xl font-bold text-brand-pink">
            {formatMessage(labels.depositAmount, {
              amount: depositAmount.toLocaleString(),
            })}
          </p>
          <Text className="mt-2 text-sm text-ui-fg-muted">{labels.depositPending}</Text>
          <Text className="mt-4 text-sm text-ui-fg-subtle">
            {labels.depositRefundNote}
          </Text>
          <Text className="mt-2 text-sm text-ui-fg-muted">{labels.depositStubNote}</Text>
        </div>
      )}

      {error && (
        <Text className="text-sm text-ui-fg-error" data-testid="create-deal-error">
          {error}
        </Text>
      )}

      <div className="flex justify-between gap-3">
        <LocalizedClientLink href="/account/group-deals/hosted">
          <Button variant="secondary">{labels.cancel}</Button>
        </LocalizedClientLink>

        <div className="flex gap-2">
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              {labels.back}
            </Button>
          )}

          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 1 && validateStep1()) {
                  setStep(2)
                } else if (step === 2 && validateStep2()) {
                  setStep(3)
                }
              }}
            >
              {labels.next}
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? labels.submitting : labels.submit}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default GroupDealCreateForm
