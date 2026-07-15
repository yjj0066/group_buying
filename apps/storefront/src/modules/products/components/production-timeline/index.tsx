"use client"

import {
  DISPLAY_PRODUCTION_STAGES,
  getDisplayStageIndex,
  parseProductionStage,
  type DisplayProductionStageId,
} from "@lib/util/idol-product"
import { useDictionary } from "@i18n/provider"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"

type ProductionTimelineProps = {
  product: HttpTypes.StoreProduct
}

const ProductionTimeline = ({ product }: ProductionTimelineProps) => {
  const t = useDictionary()
  const currentStage = parseProductionStage(product)
  const currentIndex = getDisplayStageIndex(currentStage)

  const getStageLabels = (stageId: DisplayProductionStageId) =>
    t.idol.displayStages[stageId]

  return (
    <section
      className="w-full rounded-2xl border border-neutral-100 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] small:p-6"
      aria-label={t.idol.productionStatus}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-black tracking-tight text-neutral-900">
          {t.idol.productionStatus}
        </h3>
        <span className="rounded-full bg-brand-pink/10 px-3 py-1 text-xs font-semibold text-brand-pink">
          {getStageLabels(DISPLAY_PRODUCTION_STAGES[currentIndex].id).label}
        </span>
      </div>

      <div className="relative px-2">
        <div className="absolute left-8 right-8 top-5 h-0.5 rounded-full bg-neutral-100" />
        <div
          className="absolute left-8 top-5 h-0.5 rounded-full bg-gradient-to-r from-brand-pink to-brand-purple transition-all duration-500"
          style={{
            width:
              currentIndex === 0
                ? "0%"
                : `calc(${(currentIndex / (DISPLAY_PRODUCTION_STAGES.length - 1)) * 100}% - 4rem)`,
          }}
        />

        <ol className="relative grid grid-cols-4 gap-2">
          {DISPLAY_PRODUCTION_STAGES.map((stage, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = index === currentIndex
            const isUpcoming = index > currentIndex
            const stageLabels = getStageLabels(stage.id)

            return (
              <li
                key={stage.id}
                className="flex flex-col items-center text-center"
              >
                <div
                  className={clx(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                    {
                      "scale-110 border-brand-pink bg-brand-pink/10 text-brand-pink shadow-md shadow-brand-pink/20":
                        isCurrent,
                      "border-brand-purple/40 bg-brand-purple/10 text-brand-purple":
                        isCompleted,
                      "border-neutral-200 bg-white text-neutral-400": isUpcoming,
                    }
                  )}
                >
                  {isCompleted ? (
                    <CheckCircleSolid className="h-4 w-4" />
                  ) : (
                    <span className="text-[11px] font-bold">{index + 1}</span>
                  )}
                  {isCurrent && (
                    <span className="absolute -inset-1 animate-ping rounded-full bg-brand-pink/25" />
                  )}
                </div>
                <span
                  className={clx(
                    "mt-3 text-[11px] font-semibold leading-tight small:text-xs",
                    {
                      "text-brand-pink": isCurrent,
                      "text-brand-purple": isCompleted,
                      "text-neutral-400": isUpcoming,
                    }
                  )}
                >
                  {stageLabels.label}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

export default ProductionTimeline
