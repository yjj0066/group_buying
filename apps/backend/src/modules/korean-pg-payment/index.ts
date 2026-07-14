import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import KoreanPgPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [KoreanPgPaymentProviderService],
})
