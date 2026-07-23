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
  PostStoreMeGroupDealReceiptConfirm,
  PostStoreMeGroupDealSettlement,
  PostStoreMeGroupDealShippingComplete,
} from "./group-deals/validators"
import { GROUP_DEAL_DOCUMENT_MAX_REQUEST_BODY_LIMIT } from "../../../utils/group-deal-document-upload"

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
    bodyParser: {
      sizeLimit: GROUP_DEAL_DOCUMENT_MAX_REQUEST_BODY_LIMIT,
    },
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
    bodyParser: {
      sizeLimit: GROUP_DEAL_DOCUMENT_MAX_REQUEST_BODY_LIMIT,
    },
    middlewares: [validateAndTransformBody(PostStoreMeGroupDealDocumentParse)],
  },
  {
    matcher: "/store/me/group-deals/:id/tracking/parse",
    method: "POST",
    bodyParser: {
      sizeLimit: GROUP_DEAL_DOCUMENT_MAX_REQUEST_BODY_LIMIT,
    },
    middlewares: [validateAndTransformBody(PostStoreMeGroupDealDocumentParse)],
  },
  {
    matcher: "/store/me/group-deals/:id/receipt/confirm",
    method: "POST",
    middlewares: [validateAndTransformBody(PostStoreMeGroupDealReceiptConfirm)],
  },
  {
    matcher: "/store/me/group-deals/:id/shipping/complete",
    method: "POST",
    middlewares: [
      validateAndTransformBody(PostStoreMeGroupDealShippingComplete),
    ],
  },
  {
    matcher: "/store/me/group-deals/:id/settlement",
    method: "POST",
    middlewares: [validateAndTransformBody(PostStoreMeGroupDealSettlement)],
  },
  {
    matcher: "/store/me/bank-account",
    method: "POST",
    middlewares: [validateAndTransformBody(PostStoreMeBankAccount)],
  },
]
