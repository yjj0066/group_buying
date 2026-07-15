"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { getProductPrice } from "@lib/util/get-product-price"
import {
  calculateAchievementRate,
  getDisplayStageIndex,
  isDemandSurveyStage,
  isGroupRecruitmentStage,
  parseGoodsCategory,
  parseIdolGroup,
  parseParticipation,
  parseProductionStage,
} from "@lib/util/idol-product"
import { useDictionary, formatMessage } from "@i18n/provider"
import { HttpTypes } from "@medusajs/types"
import { Button, clx } from "@modules/common/components/ui"
import BonusBenefitCard from "@modules/products/components/bonus-benefit-card"
import DemandSurveyPanel from "@modules/products/components/demand-survey-panel"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import MobileActions from "./mobile-actions"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
}: ProductActionsProps) {
  const t = useDictionary()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [surveyOpen, setSurveyOpen] = useState(false)
  const [participation, setParticipation] = useState(() =>
    parseParticipation(product)
  )
  const countryCode = useParams().countryCode as string

  const currentStage = parseProductionStage(product)
  const isDemandSurveyActive = isDemandSurveyStage(currentStage)
  const isRecruitmentActive = isGroupRecruitmentStage(currentStage)

  const idolGroup = parseIdolGroup(product)
  const goodsCategory = parseGoodsCategory(product)

  const stageBadgeLabel = useMemo(() => {
    const displayIndex = getDisplayStageIndex(currentStage)

    if (displayIndex === 0) return t.products.stageBadgeDemandSurvey
    if (displayIndex === 1) return t.products.stageBadgeRecruiting
    if (displayIndex === 2) return t.products.stageBadgeProduction
    return t.products.stageBadgeShipping
  }, [currentStage, t])

  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant, pathname, router, searchParams])

  const inStock = useMemo(() => {
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    if (selectedVariant?.allow_backorder) {
      return true
    }

    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    return false
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)
  const inView = useIntersection(actionsRef, "0px")

  const priceData = getProductPrice({
    product,
    variantId: selectedVariant?.id,
  })
  const selectedPrice = selectedVariant
    ? priceData.variantPrice
    : priceData.cheapestPrice

  const achievementRate = calculateAchievementRate(
    participation.current,
    participation.target
  )

  const handleGroupBuyParticipate = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    await addToCart({
      variantId: selectedVariant.id,
      quantity: 1,
      countryCode,
    })

    setIsAdding(false)
  }

  const handlePrimaryAction = async () => {
    if (isDemandSurveyActive) {
      setSurveyOpen(true)
      return
    }

    await handleGroupBuyParticipate()
  }

  const primaryCtaLabel = isDemandSurveyActive
    ? t.products.demandSurveyParticipate
    : !selectedVariant && !options
      ? t.products.selectVariant
      : !inStock || !isValidVariant
        ? t.products.outOfStock
        : t.products.groupBuyParticipate

  const isPrimaryDisabled =
    isDemandSurveyActive
      ? !!disabled || isAdding
      : !inStock ||
        !selectedVariant ||
        !!disabled ||
        isAdding ||
        !isValidVariant ||
        (!isRecruitmentActive && !isDemandSurveyActive)

  const actionsRefDiv = actionsRef

  return (
    <>
      <div
        ref={actionsRefDiv}
        className="flex w-full flex-col gap-6 rounded-2xl border border-neutral-100 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] small:p-8"
        data-testid="group-buy-buy-box"
      >
        <div className="flex flex-wrap gap-2">
          {idolGroup && (
            <span className="inline-flex rounded-full bg-brand-purple/10 px-3 py-1 text-xs font-semibold text-brand-purple">
              {idolGroup}
            </span>
          )}
          {goodsCategory && (
            <span className="inline-flex rounded-full bg-brand-pink/10 px-3 py-1 text-xs font-semibold text-brand-pink">
              {goodsCategory}
            </span>
          )}
          <span className="inline-flex rounded-full border border-brand-pink/20 bg-white px-3 py-1 text-xs font-semibold text-brand-pink">
            {stageBadgeLabel}
          </span>
        </div>

        <div>
          <h1
            className="text-2xl font-black leading-tight tracking-tight text-neutral-900 small:text-3xl"
            data-testid="product-title"
          >
            {product.title}
          </h1>
          {product.description && (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-neutral-500">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-b border-neutral-100 pb-6">
          {selectedPrice ? (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-neutral-400">
                  {t.products.msrpLabel}
                </span>
                <span
                  className="text-base text-neutral-400 line-through"
                  data-testid="original-product-price"
                >
                  {selectedPrice.original_price}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-brand-purple">
                  {t.products.expectedGroupBuyPrice}
                </span>
                <span
                  className="text-3xl font-black text-brand-pink"
                  data-testid="product-price"
                  data-value={selectedPrice.calculated_price_number}
                >
                  {selectedPrice.calculated_price}
                </span>
              </div>
              {Number(selectedPrice.percentage_diff) > 0 && (
                <span className="mb-1 rounded-full bg-brand-pink/10 px-2.5 py-1 text-xs font-bold text-brand-pink">
                  -{selectedPrice.percentage_diff}%
                </span>
              )}
            </>
          ) : (
            <div className="h-10 w-40 animate-pulse rounded-lg bg-neutral-100" />
          )}
        </div>

        {(product.variants?.length ?? 0) > 1 && (
          <div className="flex flex-col gap-y-4">
            <BonusBenefitCard selectedOptions={options} />
            {(product.options || []).map((option) => (
              <div key={option.id}>
                <OptionSelect
                  option={option}
                  current={options[option.id]}
                  updateOption={setOptionValue}
                  title={option.title ?? ""}
                  data-testid="product-options"
                  disabled={!!disabled || isAdding}
                />
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl bg-neutral-50 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-neutral-700">
              {formatMessage(t.idol.participationProgress, {
                current: participation.current.toLocaleString(),
                target: participation.target.toLocaleString(),
              })}
            </span>
            <span className="font-bold text-brand-purple">
              {formatMessage(t.products.achievementRate, {
                percent: Math.min(achievementRate, 100),
              })}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white">
            <div
              className="landing-progress-bar h-full rounded-full bg-gradient-to-r from-brand-pink via-brand-purple to-brand-pink"
              style={{ width: `${Math.min(achievementRate, 100)}%` }}
            />
          </div>
        </div>

        <Button
          onClick={handlePrimaryAction}
          disabled={isPrimaryDisabled}
          variant="transparent"
          className="landing-cta-btn h-12 w-full rounded-full !text-base !font-bold !text-white"
          isLoading={isAdding}
          data-testid="add-product-button"
        >
          {primaryCtaLabel}
        </Button>
      </div>

      <DemandSurveyPanel
        productId={product.id}
        open={surveyOpen}
        onClose={() => setSurveyOpen(false)}
        onParticipated={(current, target) => {
          setParticipation({ current, target })
        }}
      />

      <MobileActions
        product={product}
        variant={selectedVariant}
        options={options}
        updateOptions={setOptionValue}
        inStock={inStock}
        handlePrimaryAction={handlePrimaryAction}
        isAdding={isAdding}
        show={!inView}
        optionsDisabled={!!disabled || isAdding}
        primaryCtaLabel={primaryCtaLabel}
        isPrimaryDisabled={isPrimaryDisabled}
        participation={participation}
        achievementRate={achievementRate}
        labels={{
          selectVariant: t.products.selectVariant,
          outOfStock: t.products.outOfStock,
          selectOptions: t.products.selectOptions,
        }}
      />
    </>
  )
}
