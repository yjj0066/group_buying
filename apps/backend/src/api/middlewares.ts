import { defineMiddlewares } from "@medusajs/framework/http"

import { adminGroupDealRoutesMiddlewares } from "./admin/group-deals/middlewares"
import { storeGroupDealRoutesMiddlewares } from "./store/group-deals/middlewares"
import { storeMeRoutesMiddlewares } from "./store/me/middlewares"

export default defineMiddlewares([
  ...storeMeRoutesMiddlewares,
  ...storeGroupDealRoutesMiddlewares,
  ...adminGroupDealRoutesMiddlewares,
])
