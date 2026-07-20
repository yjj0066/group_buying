import { calculateDealApplicationTotal } from "@lib/constants/group-buying-fees"
import type { LeaderDealParticipation } from "types/leader-deal-participation"

const amountFor = (unitPrice: number, quantity = 1) =>
  calculateDealApplicationTotal(unitPrice, quantity).total

const address = (
  name: string,
  line1: string,
  line2?: string
): Pick<LeaderDealParticipation, "recipient_name" | "phone" | "address"> => ({
  recipient_name: name,
  phone: "010-1234-5678",
  address: line2 ? `${line1} ${line2}` : line1,
})

export const MOCK_LEADER_DEAL_PARTICIPATIONS: Record<
  string,
  LeaderDealParticipation[]
> = {
  "deal-hosted-twice": [
    {
      participant_id: "hosted-part-1",
      ...address("김나연", "서울특별시 강남구 테헤란로 123", "101동 1204호"),
      member_label: "나연",
      option_id: "opt-nayeon",
      quantity: 1,
      assigned_quantity: 1,
      deposit_amount: amountFor(38000),
      status: "confirmed",
      stage: "opening",
    },
    {
      participant_id: "hosted-part-2",
      ...address("이정연", "부산광역시 해운대구 센텀로 45", "1203호"),
      member_label: "정연",
      option_id: "opt-jeongyeon",
      quantity: 1,
      assigned_quantity: 1,
      deposit_amount: amountFor(38000),
      status: "confirmed",
      stage: "opening",
    },
    {
      participant_id: "hosted-part-3",
      ...address("박모모", "대구광역시 수성구 동대구로 200"),
      member_label: "모모",
      option_id: "opt-momo",
      quantity: 1,
      assigned_quantity: 1,
      deposit_amount: amountFor(38000),
      status: "confirmed",
      stage: "opening",
    },
    {
      participant_id: "hosted-part-4",
      ...address("최지효", "인천광역시 연수구 송도동 88-12"),
      member_label: "지효",
      option_id: "opt-jihyo",
      quantity: 1,
      assigned_quantity: 1,
      deposit_amount: amountFor(38000),
      status: "confirmed",
      stage: "opening",
    },
  ],
  "deal-hosted-aespa": [
    {
      participant_id: "hosted-aespa-1",
      ...address("윈터팬", "서울특별시 마포구 월드컵북로 396"),
      member_label: "카리나",
      option_id: "opt-karina",
      quantity: 1,
      assigned_quantity: 1,
      deposit_amount: amountFor(18500),
      status: "confirmed",
      stage: "opening",
    },
    {
      participant_id: "hosted-aespa-2",
      ...address("닝팬", "경기도 성남시 분당구 판교역로 235"),
      member_label: "윈터",
      option_id: "opt-winter",
      quantity: 1,
      assigned_quantity: 1,
      deposit_amount: amountFor(18500),
      status: "confirmed",
      stage: "opening",
    },
    {
      participant_id: "hosted-aespa-3",
      ...address("지젤팬", "광주광역시 서구 상무중앙로 61"),
      member_label: "닝닝",
      option_id: "opt-ningning",
      quantity: 1,
      assigned_quantity: 1,
      deposit_amount: amountFor(18500),
      status: "confirmed",
      stage: "opening",
    },
    {
      participant_id: "hosted-aespa-4",
      ...address("카리나팬", "대전광역시 유성구 대학로 291"),
      member_label: "지젤",
      option_id: "opt-giselle",
      quantity: 1,
      assigned_quantity: 1,
      deposit_amount: amountFor(18500),
      status: "confirmed",
      stage: "opening",
    },
  ],
}

export const getMockLeaderDealParticipations = (
  dealId: string
): LeaderDealParticipation[] =>
  (MOCK_LEADER_DEAL_PARTICIPATIONS[dealId] ?? []).map((item) => ({ ...item }))
