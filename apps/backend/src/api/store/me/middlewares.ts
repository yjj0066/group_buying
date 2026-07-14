import { validateAndTransformBody } from "@medusajs/framework/http"
import type { MiddlewareRoute } from "@medusajs/framework/http"

import {
  PostStoreMeLeaderDeposit,
  PostStoreMePaymentMethod,
  PutStoreMePreferences,
} from "./validators"

export default [
  {
    matcher: "/store/me/preferences",
    method: "PUT",
    middlewares: [validateAndTransformBody(PutStoreMePreferences)],
  },
  {
    matcher: "/store/me/payment-methods",
    method: "POST",
    middlewares: [validateAndTransformBody(PostStoreMePaymentMethod)],
  },
  {
    matcher: "/store/me/group-deals/:id/deposit",
    method: "POST",
    middlewares: [validateAndTransformBody(PostStoreMeLeaderDeposit)],
  },
] as MiddlewareRoute[]
