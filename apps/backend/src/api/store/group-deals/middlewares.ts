import {
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import type { MiddlewareRoute } from "@medusajs/framework/http"

import {
  PostStoreApplyGroupDeal,
  PostStoreConfirmVirtualAccountDeposit,
  PostStoreJoinGroupDeal,
} from "./validators"

export const storeGroupDealRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/group-deals/:id/join",
    method: "POST",
    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnauthenticated: true,
      }),
      validateAndTransformBody(PostStoreJoinGroupDeal),
    ],
  },
  {
    matcher: "/store/group-deals/:id/apply",
    method: "POST",
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
      validateAndTransformBody(PostStoreApplyGroupDeal),
    ],
  },
  {
    matcher: "/store/group-deals/:id/deposit-confirm",
    method: "POST",
    middlewares: [
      authenticate("customer", ["session", "bearer"]),
      validateAndTransformBody(PostStoreConfirmVirtualAccountDeposit),
    ],
  },
]
