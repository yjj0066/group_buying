# 기술 리뷰 미팅 — 1페이지 질문지

> **프로젝트:** 아이돌 굿즈 공동구매 (group-buying-site)  
> **스택:** Medusa v2.17 + Next.js 15 + PostgreSQL (+ Flask 검색·추천, 선택)  
> **저장소:** https://github.com/yjj0066/group_buying  
> **목적:** 실서비스 전환 전 아키텍처·결제·동시성 리스크 검증

---

## 프로젝트 배경 (30초 피치)

1. K-POP 굿즈 **총대(리더) 중심 공동구매** — 멤버별 자리 선택, 최소 인원, 보증금, 수령 후 정산.
2. **Medusa v2 커스텀 모듈**(`group-buying`) + Next.js 스토어프론트; Flask는 검색·추천·로그만 담당.
3. 결제는 **이중 경로**: (A) join → 가상계좌 → deposit 5분 홀드, (B) join → cart → Toss/Stripe 에스크로.
4. v3 스펙 대부분 UI/API는 있으나 **VA webhook·알림·가격인하 환불·seat lock** 등은 stub/미완.
5. **6개월 목표 (미팅에서 확인):** □ 내부 데모  □ 클로즈드 베타(실결제)  □ 퍼블릭 오픈

---

## Top 10 질문 (우선순위순)

| # | 영역 | 질문 |
|---|------|------|
| **1** | 아키텍처 | Medusa v2를 commerce core로 두고 공구(상태머신·보증금·정산)를 custom module로 확장하는 선택이 적절한가요? 별도 orchestration service가 필요한 시점은 언제인가요? |
| **2** | 결제 | **VA(가상계좌)와 PG 에스크로를 동시에 유지**하는 현재 구조를 실무에서 어떻게 정리하나요? KR=VA only / 해외=PG only로 갈아타는 게 나은가요? |
| **3** | 결제 | VA **입금 확인 webhook** 설계 시 idempotency·reconciliation·실패 재처리 패턴을 어떻게 잡나요? (현재 `deposit-confirm` stub) |
| **4** | 동시성 | 멤버별 옵션 **seat 예약/홀드**를 서버에서 어떻게 구현하나요? 클라이언트 5분 홀드만으로는 부족한가요? (Redis lock / DB row lock / hold API) |
| **5** | 상태머신 | `GroupDeal`(OPEN→MINIMUM_REACHED→CLOSED→SETTLED)과 **Medusa Order status**의 source of truth를 어디에 두고 어떻게 동기화하나요? |
| **6** | 정산 | **minimum_reached 후 일괄 캡처 실패**, no-show, 부분 환불, waitlist 재매칭을 workflow로 어떻게 묶나요? |
| **7** | 정산 | 모집 중 **가격 인하**(DASH) 시 기존 참여자 **차액 환불**을 어느 레이어(워크플로/PG)에서 처리하는 게 맞나요? |
| **8** | 데이터 | 후기·분쟁·신뢰 점수를 **deal metadata**가 아닌 별도 엔티티로 빼야 하는 시점과 추천 스키마는? |
| **9** | 운영 | Medusa **worker mode + hourly cron**(미결제 만료, deal close, D+7 자동 수령)을 prod(Vercel + Supabase + Medusa)에 어떻게 배치하나요? |
| **10** | 테스트 | **join → deposit → capture → delivery → settlement** E2E 중 어디부터 넣는 ROI가 가장 좋나요? |

---

## 미팅에서 같이 보여줄 것 (선택)

- [ ] 아키텍처: README 또는 CODE_ANALYSIS §2 다이어그램
- [ ] 참여 플로우: `POST /join` → `/deposit` (5분) 시퀀스
- [ ] stub 목록: VA webhook, 알림, OCR 영수증, server seat lock
- [ ] 현재 API: `/store/me/trust-profile`, `price-recommendations`, `settlements`

---

## 미팅 후 기록란

| 항목 | 결론 / 액션 |
|------|-------------|
| Medusa 확장 vs 별도 서비스 | |
| VA vs PG 전략 | |
| seat lock 구현 방향 | |
| webhook / 정산 우선순위 | |
| 다음 2주 액션 아이템 | |

---

*작성: 2026-07-15 · 상세 현황: [PROJECT_STATUS.md](../PROJECT_STATUS.md)*
