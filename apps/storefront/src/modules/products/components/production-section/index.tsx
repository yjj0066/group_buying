"use client"

import { useState } from "react"

import {
  parseParticipation,
  parseProductionStage,
} from "@lib/util/idol-product"
import { HttpTypes } from "@medusajs/types"
import DemandSurveyPanel from "@modules/products/components/demand-survey-panel"
import ParticipationGauge from "@modules/products/components/participation-gauge"
import ProductionTimeline from "@modules/products/components/production-timeline"
import UnlockRewardGauge from "@modules/products/components/unlock-reward-gauge"

type ProductionSectionProps = {
  product: HttpTypes.StoreProduct
}

const ProductionSection = ({ product }: ProductionSectionProps) => {
  const initialParticipation = parseParticipation(product)
  const [participation, setParticipation] = useState(initialParticipation)
  const [surveyOpen, setSurveyOpen] = useState(false)

  const currentStage = parseProductionStage(product)
  const isDemandSurveyActive = currentStage === "demand_survey"

  const handleDemandSurveyClick = () => {
    if (!isDemandSurveyActive) {
      return
    }

    setSurveyOpen(true)
  }

  return (
    <>
      <ProductionTimeline
        product={product}
        onDemandSurveyClick={handleDemandSurveyClick}
        isDemandSurveyActive={isDemandSurveyActive}
      />
      <ParticipationGauge
        current={participation.current}
        target={participation.target}
      />
      <UnlockRewardGauge
        current={participation.current}
        target={participation.target}
      />
      <DemandSurveyPanel
        productId={product.id}
        open={surveyOpen}
        onClose={() => setSurveyOpen(false)}
        onParticipated={(current, target) => {
          setParticipation({ current, target })
        }}
      />
    </>
  )
}

export default ProductionSection
