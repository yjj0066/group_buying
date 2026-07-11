import { model } from "@medusajs/framework/utils"
import {
  GroupDealParticipantStatus,
  GroupDealStatus,
} from "../../../types/group-buying"

export const GroupDeal = model.define(
  { tableName: "group_deal", name: "GroupDeal" },
  {
    id: model.id({ prefix: "gdeal" }).primaryKey(),
    title: model.text().searchable(),
    description: model.text().nullable(),
    product_id: model.text(),
    variant_id: model.text().nullable(),
    target_quantity: model.number(),
    current_quantity: model.number().default(0),
    original_price: model.bigNumber(),
    deal_price: model.bigNumber(),
    currency_code: model.text(),
    status: model.enum(GroupDealStatus).default(GroupDealStatus.DRAFT),
    starts_at: model.dateTime(),
    ends_at: model.dateTime(),
    metadata: model.json().nullable(),
    participants: model.hasMany(() => GroupDealParticipant, {
      mappedBy: "group_deal",
    }),
  }
)

export const GroupDealParticipant = model.define(
  { tableName: "group_deal_participant", name: "GroupDealParticipant" },
  {
    id: model.id({ prefix: "gpart" }).primaryKey(),
    customer_id: model.text().nullable(),
    email: model.text(),
    quantity: model.number().default(1),
    status: model
      .enum(GroupDealParticipantStatus)
      .default(GroupDealParticipantStatus.PENDING),
    order_id: model.text().nullable(),
    group_deal: model.belongsTo(() => GroupDeal, {
      mappedBy: "participants",
    }),
  }
)

export default GroupDeal
