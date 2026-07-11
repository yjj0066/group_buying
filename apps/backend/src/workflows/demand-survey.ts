import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

const DEMAND_SURVEY_STAGES = new Set([
  "demand_survey",
  "demand-survey",
  "수요조사",
])

const isDemandSurveyStage = (stage: unknown): boolean => {
  if (typeof stage !== "string" || !stage.trim()) {
    return true
  }

  const normalized = stage.trim().toLowerCase()

  return (
    DEMAND_SURVEY_STAGES.has(stage.trim()) ||
    DEMAND_SURVEY_STAGES.has(normalized)
  )
}

export type JoinDemandSurveyStepInput = {
  product_id: string
  participant_id: string
  email?: string
}

export const joinDemandSurveyStep = createStep(
  "join-demand-survey",
  async (input: JoinDemandSurveyStepInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const productModule = container.resolve(Modules.PRODUCT)

    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "metadata"],
      filters: { id: input.product_id },
    })

    const product = products?.[0]

    if (!product) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product with id: ${input.product_id} was not found`
      )
    }

    const metadata = (product.metadata ?? {}) as Record<string, unknown>

    if (!isDemandSurveyStage(metadata.production_stage)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Demand survey participation is only available during the demand survey stage"
      )
    }

    const participantIds = Array.isArray(metadata.participation_participant_ids)
      ? (metadata.participation_participant_ids as string[])
      : []

    if (participantIds.includes(input.participant_id)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "You have already participated in this demand survey"
      )
    }

    const current = Number(metadata.participation_current ?? 0)
    const target = Number(metadata.participation_target ?? 100)
    const nextCurrent = Number.isFinite(current) ? current + 1 : 1

    const participationEmails = Array.isArray(metadata.participation_emails)
      ? (metadata.participation_emails as string[])
      : []

    await productModule.updateProducts(input.product_id, {
      metadata: {
        ...metadata,
        participation_current: nextCurrent,
        participation_participant_ids: [...participantIds, input.participant_id],
        ...(input.email
          ? { participation_emails: [...participationEmails, input.email] }
          : {}),
      },
    })

    return new StepResponse({
      participation_current: nextCurrent,
      participation_target: Number.isFinite(target) && target > 0 ? target : 100,
    })
  }
)

export const joinDemandSurveyWorkflow = createWorkflow(
  "join-demand-survey",
  (input: JoinDemandSurveyStepInput) => {
    const result = joinDemandSurveyStep(input)

    return new WorkflowResponse(result)
  }
)
