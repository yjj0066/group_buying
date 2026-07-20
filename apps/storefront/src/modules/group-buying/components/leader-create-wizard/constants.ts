export const LEADER_CREATE_WIZARD_STORAGE_KEY = "gb-leader-create-wizard-draft"

export const LEADER_CREATE_WIZARD_STEPS = [
  "공구 정보",
  "자리·가격",
  "앨범 수량",
  "보증금",
] as const

export const LEADER_CREATE_WIZARD_STEP_INDEX = {
  basic: 0,
  product: 1,
  sales: 2,
  deposit: 3,
} as const

export const DEFAULT_LEADER_CREATE_STEP_TITLES = [
  "공구 정보를 입력해 주세요",
  "자리와 가격을 설정해 주세요",
  "앨범 수량을 적어주세요",
  "보증금을 예치해 주세요",
] as const

type LeaderCreateWizardLabels = {
  stepTitles?: readonly string[]
  wireframeTitle: string
}

export const resolveLeaderCreateStepTitle = (
  labels: LeaderCreateWizardLabels,
  stepIndex: number
) =>
  labels.stepTitles?.[stepIndex] ??
  DEFAULT_LEADER_CREATE_STEP_TITLES[stepIndex] ??
  labels.wireframeTitle

export {
  GOODS_TYPE_OPTIONS,
  IDOL_GROUP_SUGGESTIONS as IDOL_GROUP_OPTIONS,
} from "@lib/constants/group-buying-catalog"

export const PRODUCT_OPTIONS = [
  "aespa - 시즌그reetings",
  "IVE - 1st Album",
  "NewJeans - Supernatural",
  "LE SSERAFIM - CRAZY",
] as const
