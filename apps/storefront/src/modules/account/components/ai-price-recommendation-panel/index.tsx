"use client"

import { useState } from "react"

import {
  applyPriceRecommendations,
} from "@lib/data/account-group-deals"
import { Button, Text } from "@modules/common/components/ui"
import { convertToLocale } from "@lib/util/money"
import type { OptionPriceRecommendation } from "types/account-group-deals"

type AiPriceRecommendationPanelLabels = {
  title: string
  description: string
  disclaimer: string
  applyAll: string
  applying: string
  applySuccess: string
  applyError: string
  empty: string
  currentPrice: string
  recommendedPrice: string
  vacancyRisk: string
  riskLevels: Record<OptionPriceRecommendation["vacancy_risk"], string>
}

type AiPriceRecommendationPanelProps = {
  dealId: string
  currencyCode: string
  initialRecommendations: OptionPriceRecommendation[]
  disclaimer: string
  labels: AiPriceRecommendationPanelLabels
}

const AiPriceRecommendationPanel = ({
  dealId,
  currencyCode,
  initialRecommendations,
  disclaimer,
  labels,
}: AiPriceRecommendationPanelProps) => {
  const [recommendations, setRecommendations] = useState(
    initialRecommendations
  )
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")
  const [message, setMessage] = useState<string | null>(null)

  const applicable = recommendations.filter(
    (item) => item.recommended_price < item.current_price
  )

  const handleApplyAll = async () => {
    if (!applicable.length) {
      return
    }

    setStatus("loading")
    setMessage(null)

    try {
      const response = await applyPriceRecommendations(
        dealId,
        applicable.map((item) => ({
          option_id: item.option_id,
          deal_price: item.recommended_price,
        }))
      )

      setRecommendations(response.recommendations)
      setStatus("success")
      setMessage(labels.applySuccess)
    } catch {
      setStatus("error")
      setMessage(labels.applyError)
    }
  }

  if (!recommendations.length) {
    return (
      <section className="rounded-xl border border-dashed border-ui-border-base p-5">
        <Text className="font-semibold">{labels.title}</Text>
        <Text className="mt-2 text-sm text-ui-fg-subtle">{labels.empty}</Text>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-ui-border-base p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text className="text-lg font-semibold">{labels.title}</Text>
          <Text className="mt-1 text-sm text-ui-fg-subtle">
            {labels.description}
          </Text>
        </div>
        <Button
          size="small"
          onClick={handleApplyAll}
          disabled={!applicable.length || status === "loading"}
        >
          {status === "loading" ? labels.applying : labels.applyAll}
        </Button>
      </div>

      <Text className="mt-3 text-xs text-ui-fg-muted">
        {disclaimer || labels.disclaimer}
      </Text>

      <ul className="mt-4 flex flex-col gap-3">
        {recommendations.map((item) => (
          <li
            key={item.option_id}
            className="rounded-lg bg-ui-bg-subtle p-4 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Text className="font-medium">{item.label}</Text>
              <span className="rounded-full bg-ui-bg-base px-2 py-0.5 text-xs text-ui-fg-muted">
                {labels.vacancyRisk}: {labels.riskLevels[item.vacancy_risk]}
              </span>
            </div>
            <div className="mt-2 grid gap-1 text-ui-fg-subtle small:grid-cols-2">
              <span>
                {labels.currentPrice}:{" "}
                {convertToLocale({
                  amount: item.current_price,
                  currency_code: currencyCode,
                })}
              </span>
              <span>
                {labels.recommendedPrice}:{" "}
                {convertToLocale({
                  amount: item.recommended_price,
                  currency_code: currencyCode,
                })}
              </span>
            </div>
            <Text className="mt-2 text-xs text-ui-fg-muted">{item.reason}</Text>
          </li>
        ))}
      </ul>

      {message && (
        <Text
          className={`mt-3 text-sm ${
            status === "error" ? "text-ui-fg-error" : "text-ui-fg-interactive"
          }`}
        >
          {message}
        </Text>
      )}
    </section>
  )
}

export default AiPriceRecommendationPanel
