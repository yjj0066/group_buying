import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import StripeGroupDealProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [StripeGroupDealProviderService],
})
