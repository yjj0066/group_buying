"use client"

import {
  getProductionStageIndex,
  parseProductionStage,
  PRODUCTION_STAGES,
  type ProductionStageId,
} from "@lib/util/idol-product"
import { useDictionary, formatMessage } from "@i18n/provider"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import type { KeyboardEvent } from "react"

type ProductionTimelineProps = {
  product: HttpTypes.StoreProduct
  onDemandSurveyClick?: () => void
  isDemandSurveyActive?: boolean
}

const ProductionTimeline = ({
  product,
  onDemandSurveyClick,
  isDemandSurveyActive = false,
}: ProductionTimelineProps) => {
  const t = useDictionary()
  const currentStage = parseProductionStage(product)
  const currentIndex = getProductionStageIndex(currentStage)

  const getStageLabels = (stageId: ProductionStageId) => {
    return t.idol.stages[stageId]
  }

  const currentStageLabels = getStageLabels(currentStage)

  return (
    <section
      className="w-full rounded-2xl border border-ui-border-base bg-white p-4 small:p-5 shadow-sm"
      aria-label={t.idol.productionStatus}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ui-fg-base">
          {t.idol.productionStatus}
        </h3>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600">
          {currentStageLabels.label}
        </span>
      </div>

      {isDemandSurveyActive && (
        <p className="mb-4 text-xs text-rose-600 font-medium">
          {t.idol.demandSurvey.clickHint}
        </p>
      )}

      <div className="relative">
        <div className="absolute left-4 right-4 top-5 h-1 rounded-full bg-ui-bg-subtle" />
        <div
          className="absolute left-4 top-5 h-1 rounded-full bg-gradient-to-r from-rose-400 via-fuchsia-400 to-violet-400 transition-all duration-500"
          style={{
            width: `calc(${(currentIndex / (PRODUCTION_STAGES.length - 1)) * 100}% - 2rem)`,
          }}
        />

        <ol className="relative grid grid-cols-5 gap-1">
          {PRODUCTION_STAGES.map((stage, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const isUpcoming = index > currentIndex
            const stageLabels = getStageLabels(stage.id)
            const isDemandSurveyStep =
              stage.id === "demand_survey" && isDemandSurveyActive && isCurrent

            const stepCircle = (
              <div
                className={clx(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                  {
                    "border-rose-400 bg-rose-50 text-rose-600 shadow-md shadow-rose-100 scale-110":
                      isCurrent,
                    "border-violet-300 bg-violet-50 text-violet-600": isCompleted,
                    "border-ui-border-base bg-white text-ui-fg-muted": isUpcoming,
                    "cursor-pointer hover:scale-110 hover:shadow-lg hover:shadow-rose-100":
                      isDemandSurveyStep,
                  }
                )}
              >
                {isCompleted ? (
                  <CheckCircleSolid className="h-4 w-4" />
                ) : (
                  <span className="text-[11px] font-bold">{index + 1}</span>
                )}
                {isCurrent && (
                  <span className="absolute -inset-1 rounded-full bg-rose-300/30 animate-ping" />
                )}
              </div>
            )

            return (
              <li key={stage.id} className="flex flex-col items-center text-center">
                {isDemandSurveyStep ? (
                  <button
                    type="button"
                    onClick={onDemandSurveyClick}
                    className="flex flex-col items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                    aria-label={formatMessage(t.idol.demandSurvey.participateButton, {})}
                  >
                    {stepCircle}
                  </button>
                ) : (
                  stepCircle
                )}
                <span
                  className={clx(
                    "mt-2 hidden text-[10px] font-medium leading-tight small:block",
                    {
                      "text-rose-600 font-semibold": isCurrent,
                      "text-violet-600": isCompleted,
                      "text-ui-fg-muted": isUpcoming,
                      "cursor-pointer hover:underline": isDemandSurveyStep,
                    }
                  )}
                  {...(isDemandSurveyStep
                    ? {
                        role: "button",
                        tabIndex: 0,
                        onClick: onDemandSurveyClick,
                        onKeyDown: (event: KeyboardEvent) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            onDemandSurveyClick?.()
                          }
                        },
                      }
                    : {})}
                >
                  {stageLabels.label}
                </span>
                <span
                  className={clx(
                    "mt-2 text-[10px] font-medium leading-tight small:hidden",
                    {
                      "text-rose-600 font-semibold": isCurrent,
                      "text-violet-600": isCompleted,
                      "text-ui-fg-muted": isUpcoming,
                    }
                  )}
                >
                  {stageLabels.shortLabel}
                </span>
                {isDemandSurveyStep && (
                  <button
                    type="button"
                    onClick={onDemandSurveyClick}
                    className="mt-1 text-[10px] font-semibold text-rose-600 underline underline-offset-2 small:hidden"
                  >
                    {t.idol.demandSurvey.joinShort}
                  </button>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

export default ProductionTimeline
