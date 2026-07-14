import { model } from "@medusajs/framework/utils"
import {
  GroupDealOptionType,
  GroupDealParticipantStatus,
  GroupDealPaymentPhaseMode,
  GroupDealSecondPaymentStatus,
  GroupDealShippingFeeStatus,
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
    min_participants: model.number().default(1),
    current_participants: model.number().default(0),
    target_quantity: model.number(),
    current_quantity: model.number().default(0),
    max_quantity: model.number().nullable(),
    original_price: model.bigNumber(),
    deal_price: model.bigNumber(),
    currency_code: model.text(),
    /**
     * 결제 단계 모드
     * - single: 상품가만 결제
     * - split_product_shipping: 1차(상품) + 2차(배송비) 분리
     */
    payment_phase_mode: model
      .enum(GroupDealPaymentPhaseMode)
      .default(GroupDealPaymentPhaseMode.SINGLE),
    /** 공구 전체 배송비 정산 상태 (2차금 운영용) */
    shipping_fee_status: model
      .enum(GroupDealShippingFeeStatus)
      .default(GroupDealShippingFeeStatus.NOT_APPLICABLE),
    /** 예상 1인당 배송비 (2차금 견적) */
    estimated_shipping_fee: model.bigNumber().nullable(),
    shipping_fee_note: model.text().nullable(),
    status: model.enum(GroupDealStatus).default(GroupDealStatus.DRAFT),
    starts_at: model.dateTime(),
    ends_at: model.dateTime(),
    metadata: model.json().nullable(),
    options: model.hasMany(() => GroupDealOption, {
      mappedBy: "group_deal",
    }),
    participants: model.hasMany(() => GroupDealParticipant, {
      mappedBy: "group_deal",
    }),
  }
)

/**
 * 멤버/버전 등 선택 옵션 — 옵션별 목표·재고 상한 관리
 */
export const GroupDealOption = model.define(
  { tableName: "group_deal_option", name: "GroupDealOption" },
  {
    id: model.id({ prefix: "gopt" }).primaryKey(),
    option_type: model.enum(GroupDealOptionType).default(GroupDealOptionType.MEMBER),
    /** 내부 식별 키 (예: member_karina, ver_a) */
    option_key: model.text(),
    /** 표시명 (예: 카리나, A버전) */
    label: model.text(),
    /** 옵션별 1차금 단가. null이면 deal.deal_price 사용 */
    deal_price: model.bigNumber().nullable(),
    original_price: model.bigNumber().nullable(),
    /** 옵션별 최대 수량 (null = 제한 없음) */
    max_quantity: model.number().nullable(),
    /** 옵션별 목표 수량 (진행률 게이지용) */
    target_quantity: model.number().nullable(),
    current_quantity: model.number().default(0),
    sort_order: model.number().default(0),
    is_active: model.boolean().default(true),
    metadata: model.json().nullable(),
    group_deal: model.belongsTo(() => GroupDeal, {
      mappedBy: "options",
    }),
    selections: model.hasMany(() => GroupDealParticipantSelection, {
      mappedBy: "option",
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
    cart_id: model.text().nullable(),
    order_id: model.text().nullable(),
    billing_customer_key: model.text().nullable(),
    billing_key_encrypted: model.text().nullable(),
    /** pp_toss-payments_* 또는 pp_stripe-group-deal_* */
    payment_provider_id: model.text().nullable(),
    /** Stripe SetupIntent 예약 결제용 */
    stripe_customer_id: model.text().nullable(),
    stripe_payment_method_id_encrypted: model.text().nullable(),
    payment_session_id: model.text().nullable(),
    /** 1차금(상품가) 합계 — 빌링키 캡처 금액 */
    first_payment_amount: model.bigNumber().nullable(),
    /** 2차금(배송비) — 출고 후 별도 청구 */
    second_payment_amount: model.bigNumber().nullable(),
    second_payment_status: model
      .enum(GroupDealSecondPaymentStatus)
      .default(GroupDealSecondPaymentStatus.NOT_REQUIRED),
    second_payment_order_id: model.text().nullable(),
    capture_attempts: model.number().default(0),
    last_capture_error: model.text().nullable(),
    reserved_at: model.dateTime().nullable(),
    captured_at: model.dateTime().nullable(),
    group_deal: model.belongsTo(() => GroupDeal, {
      mappedBy: "participants",
    }),
    selections: model.hasMany(() => GroupDealParticipantSelection, {
      mappedBy: "participant",
    }),
  }
)

/**
 * 참여자의 옵션별 수량 선택 (멤버별 포토카드 수량 등)
 */
export const GroupDealParticipantSelection = model.define(
  {
    tableName: "group_deal_participant_selection",
    name: "GroupDealParticipantSelection",
  },
  {
    id: model.id({ prefix: "gpsel" }).primaryKey(),
    quantity: model.number().default(1),
    /** 참여 시점 단가 스냅샷 (1차금) */
    unit_price: model.bigNumber(),
    metadata: model.json().nullable(),
    participant: model.belongsTo(() => GroupDealParticipant, {
      mappedBy: "selections",
    }),
    option: model.belongsTo(() => GroupDealOption, {
      mappedBy: "selections",
    }),
  }
)

export default GroupDeal
