import { Module } from "@medusajs/framework/utils"
import GroupBuyingModuleService from "./service"

export const GROUP_BUYING_MODULE = "groupBuying"

export default Module(GROUP_BUYING_MODULE, {
  service: GroupBuyingModuleService,
})
