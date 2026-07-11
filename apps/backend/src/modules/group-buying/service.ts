import { MedusaService } from "@medusajs/framework/utils"
import { GroupDeal, GroupDealParticipant } from "./models"

class GroupBuyingModuleService extends MedusaService({
  GroupDeal,
  GroupDealParticipant,
}) {}

export default GroupBuyingModuleService
