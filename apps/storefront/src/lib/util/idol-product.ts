import { HttpTypes } from "@medusajs/types"

export const PRODUCTION_STAGES = [
  { id: "demand_survey" },
  { id: "pre_deposit" },
  { id: "general_deposit" },
  { id: "in_production" },
  { id: "shipping" },
] as const

export type ProductionStageId = (typeof PRODUCTION_STAGES)[number]["id"]

const STAGE_ALIASES: Record<string, ProductionStageId> = {
  demand_survey: "demand_survey",
  "수요조사": "demand_survey",
  "demand-survey": "demand_survey",
  pre_deposit: "pre_deposit",
  "선입금": "pre_deposit",
  "선입금 진행": "pre_deposit",
  "pre-deposit": "pre_deposit",
  general_deposit: "general_deposit",
  "일반입금": "general_deposit",
  "general-deposit": "general_deposit",
  in_production: "in_production",
  "제작 진행 중": "in_production",
  "제작중": "in_production",
  "in-production": "in_production",
  shipping: "shipping",
  "배송 시작": "shipping",
  "배송": "shipping",
}

const STAGE_TAG_PREFIX = "stage:"

export const parseProductionStage = (
  product: Pick<HttpTypes.StoreProduct, "metadata" | "tags">
): ProductionStageId => {
  const metadataStage = product.metadata?.production_stage

  if (typeof metadataStage === "string") {
    const normalized = metadataStage.trim().toLowerCase()
    const match =
      STAGE_ALIASES[normalized] ?? STAGE_ALIASES[metadataStage.trim()]

    if (match) {
      return match
    }
  }

  const stageTag = product.tags?.find((tag) => {
    const value = tag.value?.toLowerCase() ?? ""
    return value.startsWith(STAGE_TAG_PREFIX)
  })

  if (stageTag?.value) {
    const tagStage = stageTag.value
      .slice(STAGE_TAG_PREFIX.length)
      .trim()
      .toLowerCase()
    const match = STAGE_ALIASES[tagStage]

    if (match) {
      return match
    }
  }

  const namedStageTag = product.tags?.find((tag) => {
    const value = tag.value?.trim() ?? ""
    return STAGE_ALIASES[value] || STAGE_ALIASES[value.toLowerCase()]
  })

  if (namedStageTag?.value) {
    return (
      STAGE_ALIASES[namedStageTag.value] ??
      STAGE_ALIASES[namedStageTag.value.toLowerCase()]
    )
  }

  return "demand_survey"
}

export const getProductionStageIndex = (stageId: ProductionStageId): number => {
  return PRODUCTION_STAGES.findIndex((stage) => stage.id === stageId)
}

export const parseParticipation = (
  product: Pick<HttpTypes.StoreProduct, "metadata">
) => {
  const current = Number(product.metadata?.participation_current ?? 0)
  const target = Number(product.metadata?.participation_target ?? 100)

  return {
    current: Number.isFinite(current) ? current : 0,
    target: Number.isFinite(target) && target > 0 ? target : 100,
  }
}

const FULL_SET_KEYWORDS = ["풀세트", "full set", "fullset", "전체 멤버", "전멤버", "all members"]

export const isFullSetOptionValue = (value: string): boolean => {
  const normalized = value.trim().toLowerCase()

  return FULL_SET_KEYWORDS.some((keyword) =>
    normalized.includes(keyword.toLowerCase())
  )
}

export const getSelectedOptionValues = (
  options: Record<string, string | undefined>
): string[] => {
  return Object.values(options).filter((value): value is string => !!value)
}

export const hasFullSetSelection = (
  options: Record<string, string | undefined>
): boolean => {
  return getSelectedOptionValues(options).some(isFullSetOptionValue)
}

export const calculateAchievementRate = (
  current: number,
  target: number
): number => {
  if (target <= 0) {
    return 0
  }

  return Math.round((current / target) * 100)
}

export const DISPLAY_PRODUCTION_STAGES = [
  { id: "demand_survey" },
  { id: "group_recruitment" },
  { id: "in_production" },
  { id: "shipping" },
] as const

export type DisplayProductionStageId =
  (typeof DISPLAY_PRODUCTION_STAGES)[number]["id"]

export const getDisplayStageIndex = (
  stageId: ProductionStageId
): number => {
  if (stageId === "demand_survey") {
    return 0
  }

  if (stageId === "pre_deposit" || stageId === "general_deposit") {
    return 1
  }

  if (stageId === "in_production") {
    return 2
  }

  return 3
}

export const parseIdolGroup = (
  product: Pick<HttpTypes.StoreProduct, "metadata" | "collection">
): string | null => {
  const fromMetadata = product.metadata?.idol_group

  if (typeof fromMetadata === "string" && fromMetadata.trim()) {
    return fromMetadata.trim()
  }

  if (product.collection?.title) {
    return product.collection.title
  }

  return null
}

export const parseGoodsCategory = (
  product: Pick<HttpTypes.StoreProduct, "metadata" | "type">
): string | null => {
  const goodsType = product.metadata?.goods_type

  if (typeof goodsType === "string" && goodsType.trim()) {
    return goodsType.trim()
  }

  if (product.type?.value) {
    return product.type.value
  }

  return null
}

export const isDemandSurveyStage = (stageId: ProductionStageId): boolean =>
  stageId === "demand_survey"

export const isGroupRecruitmentStage = (stageId: ProductionStageId): boolean =>
  stageId === "pre_deposit" || stageId === "general_deposit"
