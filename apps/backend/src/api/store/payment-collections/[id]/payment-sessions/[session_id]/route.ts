import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import type { IPaymentModuleService } from "@medusajs/framework/types"

type ConfirmPaymentSessionBody = {
  data?: Record<string, unknown>
}

/**
 * 결제 프로바이더 확인 데이터(authKey, paymentKey 등)를 세션에 병합합니다.
 * cart.complete() 직전에 스토어프론트에서 호출합니다.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<ConfirmPaymentSessionBody>,
  res: MedusaResponse
) => {
  const collectionId = req.params.id
  const sessionId = req.params.session_id
  const incomingData = req.body?.data ?? {}

  if (!Object.keys(incomingData).length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Payment confirmation data is required"
    )
  }

  const paymentModule = req.scope.resolve<IPaymentModuleService>(
    Modules.PAYMENT
  )

  const session = await paymentModule.retrievePaymentSession(sessionId)

  if (session.payment_collection_id !== collectionId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Payment session does not belong to this payment collection"
    )
  }

  const updated = await paymentModule.updatePaymentSession({
    id: sessionId,
    currency_code: session.currency_code,
    amount: session.amount,
    data: {
      ...(session.data ?? {}),
      ...incomingData,
    },
  })

  res.status(200).json({
    payment_session: updated,
  })
}
