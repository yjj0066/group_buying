import {
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import type { MiddlewareRoute } from "@medusajs/framework/http"

import { PostStoreMeBankAccount } from "./bank-account/validators"
import {
  PostStoreMeLeaderDeposit,
  PostStoreMePaymentMethod,
  PutStoreMePreferences,
} from "./validators"
import {
  PostStoreCreateGroupDeal,
  PostStoreMeGroupDealDocumentParse,
} from "./group-deals/validators"

export const storeMeRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: "ALL",
    matcher: "/store/me*",
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
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
    matcher: "/store/me/group-deals",
    method: "POST",
    middlewares: [validateAndTransformBody(PostStoreCreateGroupDeal)],
  },
  {
    matcher: "/store/me/group-deals/:id/deposit",
    method: "POST",
    middlewares: [validateAndTransformBody(PostStoreMeLeaderDeposit)],
  },
  {
    matcher: "/store/me/group-deals/:id/receipt/parse",
    method: "POST",
    middlewares: [validateAndTransformBody(PostStoreMeGroupDealDocumentParse)],
  },
  {
    matcher: "/store/me/group-deals/:id/tracking/parse",
    method: "POST",
    middlewares: [validateAndTransformBody(PostStoreMeGroupDealDocumentParse)],
  },
  {
    matcher: "/store/me/bank-account",
    method: "POST",
    middlewares: [validateAndTransformBody(PostStoreMeBankAccount)],
  },
]
