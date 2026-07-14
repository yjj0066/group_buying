import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import type { MiddlewareRoute } from "@medusajs/framework/http"

import {
  PostAdminCancelGroupDeal,
  PostAdminCreateGroupDeal,
  PostAdminGroupDealReceipt,
  PostAdminGroupDealTracking,
  PostAdminQuoteGroupDealShipping,
  PostAdminUpdateGroupDeal,
} from "./validators"

export default [
  {
    matcher: "/admin/group-deals",
    method: "POST",
    middlewares: [validateAndTransformBody(PostAdminCreateGroupDeal)],
  },
  {
    matcher: "/admin/group-deals/:id",
    method: ["POST", "PUT", "PATCH"],
    middlewares: [validateAndTransformBody(PostAdminUpdateGroupDeal)],
  },
  {
    matcher: "/admin/group-deals/:id/cancel",
    method: "POST",
    middlewares: [validateAndTransformBody(PostAdminCancelGroupDeal)],
  },
  {
    matcher: "/admin/group-deals/:id/quote-shipping",
    method: "POST",
    middlewares: [validateAndTransformBody(PostAdminQuoteGroupDealShipping)],
  },
  {
    matcher: "/admin/group-deals/:id/receipt",
    method: "POST",
    middlewares: [validateAndTransformBody(PostAdminGroupDealReceipt)],
  },
  {
    matcher: "/admin/group-deals/:id/tracking",
    method: "POST",
    middlewares: [validateAndTransformBody(PostAdminGroupDealTracking)],
  },
] as MiddlewareRoute[]
