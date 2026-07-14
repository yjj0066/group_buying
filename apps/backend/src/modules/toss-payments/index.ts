import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import TossPaymentsProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [TossPaymentsProviderService],
})
