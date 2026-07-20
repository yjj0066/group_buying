# 발표 D-7 — 미팅 질문 & 준비 자료

> **발표:** 다음 주 토요일  
> **목표:** 데모가 끊기지 않게 + 현직 개발자에게 핵심만 질문  
> **프로젝트:** Medusa 백엔드 + Next.js 쇼핑몰 + (선택) Flask 검색

---

## Part 1. 현직 개발자에게 물어볼 질문 (쉬운 말 버전)

### 질문 1 — “데모 전날 뭐부터 켜야 하나요?”

**쉬운 말:**  
로컬에서 쇼핑몰 띄울 때 **순서대로 뭘 켜야 하고**, **자주 틀리는 설정**이 뭐예요?

**왜 물어보나:**  
코드 문제가 아니라 **서버 안 켬 / API 키 / DB** 때문에 발표가 망하는 경우가 많음.

**내가 미리 알아둘 것:**
- 백엔드 `http://localhost:9000` (Admin은 `/app`)
- 쇼핑몰 `http://localhost:8000`
- `.env.local`에 `pk_` 키 있어야 함
- Flask는 **끄는 게 기본** (`SEARCH_API_ENABLED=false`)

---

### 질문 2 — “가짜 입금까지 보여줘도 되나요?”

**쉬운 말:**  
참여 → **가상계좌 화면**까지는 진짜로 보여주고, **돈 들어온 척** 하는 부분은 가짜(stub) 써도 발표에 괜찮나요?  
그때 **수동으로 뭘 눌러야** 참여 상태가 “완료”처럼 보이나요?

**왜 물어보나:**  
우리 v3 핵심이 “입금”인데, **실제 은행 연동은 아직 없음**. 어디까지 live / 어디부터 설명인지 확인.

**내가 미리 알아둘 것:**
- `join` → 입금 안내 페이지 → (나중에) 입금 확인
- 입금 확인 API: `POST /store/group-deals/:id/deposit-confirm` (stub)
- **카드 결제/checkout** 은 **다른 길** — 발표는 한 가지만 고정

---

### 질문 3 — “Admin에 뭐만 넣으면 공구 참여가 되나요?”

**쉬운 말:**  
데모용으로 Admin에 **상품·공구를 최소한 어떻게 만들어 두면** “참여하기”가 될까요?  
Open 상태, 보증금, 멤버 자리 같은 **필수 체크 항목**이 뭐예요?

**왜 물어보나:**  
데이터 없으면 **랜딩은 가짜(Mock)만** 보이고, **실제 join은 안 됨**.

**내가 미리 알아둘 것:**
- 상품: 판매 중 + 가격 + 판매 채널
- 공구: **Open** + 상품 연결 + (권장) 보증금 deposited
- 멤버 옵션: 자리 수(`max_quantity`) 있어야 자리 선택 UI 동작

---

### 질문 4 — “나중에 진짜 결제 하나만 붙이려면 뭐부터?”

**쉬운 말:**  
발표 다음에 **실제 돈** 붙일 때, **가상계좌 자동 확인** vs **토스 카드/빌링** 중 **먼저 손대야 할 하나**는 뭐예요?

**왜 물어보나:**  
지금은 **가상계좌랑 카드 결제 두 갈래**가 같이 있어서, 나중에 정리 순서를 듣고 싶음.

**내가 미리 알아둘 것:**
- KR 데모 스토리 = 가상계좌 쪽
- 토스/Stripe = 장바구니·checkout 쪽 (이미 코드 있음)

---

### 질문 5 — “발표 때 누르면 안 되는 화면/API 있나요?”

**쉬운 말:**  
토요일에 **이 순서로만** 보여줄 건데, **특히 하면 터지는 API·화면** 더 있나요?  
(아래 Green/Red 목록 들고 가기)

**왜 물어보나:**  
기능은 많은데 **발표는 10분 시나리오 하나** — 클릭 실수 방지.

**내가 미리 알아둘 것:**  
→ **Part 3 Green / Red 표**를 출력하거나 탭에 열어 두고 질문

---

## Part 2. 미팅·발표 전 준비물 체크리스트

### A. 환경 (필수)

| 항목 | 위치 / 값 | 확인 |
|------|-----------|------|
| Node 20+, pnpm | 로컬 | ☐ |
| PostgreSQL / Supabase | `apps/backend/.env` `DATABASE_URL` | ☐ |
| JWT / COOKIE secret | backend `.env` | ☐ |
| Publishable key `pk_` | Admin 발급 → `apps/storefront/.env.local` | ☐ |
| Sales Channel에 pk 연결 | Admin Settings | ☐ |
| Flask **끔** | `SEARCH_API_ENABLED=false` | ☐ |

### B. 계정 (필수)

| 용도 | 계정 | 비고 |
|------|------|------|
| Admin | `admin@test.com` / `supersecret` (또는 본인 seed) | 공구·상품 등록 |
| 참여자 데모 | 고객 1 (이메일·비번 메모) | join·deposit |
| 총대 데모 (선택) | `preferred_role=leader` | hosted 대시보드 |

### C. Admin 데모 데이터 (필수)

| 항목 | 상태 |
|------|------|
| Published 상품 1개 이상 (KRW) | ☐ |
| Group Deal 1~2개 **Open** | ☐ |
| 상품 ↔ 공구 연결 | ☐ |
| (권장) 총대 보증금 deposited | ☐ |
| member 옵션 + 수량 | ☐ |
| `ends_at` 미래 날짜 | ☐ |

### D. 기동 순서 메모 (1장)

```
1. DB 접속 확인
2. cd apps/backend → pnpm dev     → :9000 "Server is ready"
3. cd apps/storefront → pnpm dev  → :8000
4. 브라우저: /kr/group-buying → 공구 보이는지
```

### E. 백업 (발표 당일)

| 백업 | ☐ |
|------|---|
| 데모 시나리오 **녹화 영상** 1개 (2~3분) | |
| 핵심 화면 **스크린샷** 5~8장 | |
| pk / DB / .env **시크릿 노트** (USB 또는 오프라인) | |

### F. 미팅 때 가져갈 것

| 자료 | Part |
|------|------|
| Part 1 질문 5개 (인쇄 or 태블릿) | 1 |
| Part 3 Green 클릭 순서 + API | 3 |
| Part 3 Red “누르지 말 것” | 3 |
| 아키텍처 1장 (README 또는 CODE_ANALYSIS 다이어그램) | 선택 |
| stub 3줄 메모 (입금·알림·자리잠금) | 아래 |

**stub 한 줄 (발표/Q&A용):**
- 입금: 은행 webhook 미연동, 데모는 stub 또는 UI만
- 알림: DB log만, 카톡/메일 없음
- 5분 자리: 화면 타이머만, 서버 잠금 API 없음

---

## Part 3. 발표 데모 — 클릭 순서 & API

### Green — 토요일에 **이 순서만** (참여자 8분)

| 순서 | 브라우저 URL / 행동 | 호출 API (백그라운드) |
|------|---------------------|------------------------|
| 1 | `http://localhost:8000/kr/group-buying` | `GET /store/group-deals` |
| 2 | 공구 하나 클릭 → `/kr/group-buying/{id}` | `GET /store/group-deals/:id` |
| 3 | (로그인 필요 시) `/account/login` | Medusa customer auth |
| 4 | 멤버 자리 선택 → **참여하기** | `POST /store/group-deals/:id/join` |
| 5 | 자동 이동 `/kr/group-buying/{id}/deposit` | (join 응답의 `checkout_path`) |
| 6 | (리허설만) 입금 확인 stub | `POST /store/group-deals/:id/deposit-confirm` |
| 7 | (선택) `/account/group-deals/participations` | `GET /store/me/group-deals/participations` |

**join API가 주는 것 (말로 설명용):**
- 가상계좌 번호·금액
- 5분 안에 입금하라는 deadline
- deposit 페이지 주소

---

### Green — 추가 3분 (총대·차별화, 시간 있을 때)

| 순서 | URL | API |
|------|-----|-----|
| 1 | `/account/group-deals/hosted` | `GET /store/me/group-deals/hosted` |
| 2 | hosted `[id]` 대시보드 | `GET .../price-recommendations` |
| 3 | `/account/trust-reviews` | `GET /store/me/trust-profile` |

---

### Yellow — “만들어 뒀지만 발표에선 안 누름”

| 기능 | API / URL | 이유 |
|------|-----------|------|
| 검색 | `/store?q=` + Flask | Flask 꺼두면 비어 있음 |
| AI 추천 슬라이더 | `/api/ai/recommendations` | 없어도 발표 OK |
| 카드 결제·checkout | cart, checkout, payment-methods | VA랑 섞이면 길어짐 |
| 긴급 모집 | `POST .../urgent-fill` | 시간 |
| 정산 표 | `GET .../settlements` | 시간 |
| 후기/분쟁 submit | `POST .../review`, `.../dispute` | 폼만 보여도 됨 |

---

### Red — **발표 때 누르지 말 것**

| 기능 | 이유 |
|------|------|
| Flask 검색 live (`?q=bts`) | :5000 없으면 실패·느림 |
| 같은 공구 join 여러 번 연속 | 중복·에러 |
| AI 단가 **일괄 적용** (apply-price) | 가격 바뀜 + 환불 미구현 |
| 비밀번호 찾기 / 고객센터 | UI만 있고 API 없음 |
| 총대 리포트 페이지 | 스텁 |
| Admin에서 공구 **삭제·상태 막 바꾸기** | 데모 데이터 망가짐 |

---

## Part 4. API 한눈에 (미팅·질문 5용)

### 공개 API (로그인 없음)

| Method | 경로 | 한 줄 설명 |
|--------|------|------------|
| GET | `/store/group-deals` | 공구 목록 |
| GET | `/store/group-deals/:id` | 공구 상세 + 자리(options) |
| POST | `/store/group-deals/:id/join` | **참여 + 가상계좌 발급** |
| POST | `/store/group-deals/:id/deposit-confirm` | 입금 확인 (stub) |
| GET | `/store/regions` | 국가/지역 (middleware) |

### 로그인 필요 (`/store/me/...`)

| Method | 경로 | 한 줄 설명 |
|--------|------|------------|
| GET | `/store/me/group-deals/participations` | 내 참여 목록 |
| GET | `/store/me/group-deals/hosted` | 내가 연 공구 |
| GET | `/store/me/group-deals/:id/price-recommendations` | AI 단가 추천 |
| GET | `/store/me/trust-profile` | 총대 신뢰·후기 |
| POST | `/store/me/group-deals/participations/:id/review` | 후기 작성 |
| GET | `/store/me/group-deals/settlements` | 정산 |

### Admin (운영 데모)

| Method | 경로 | 한 줄 설명 |
|--------|------|------------|
| GET/POST | `/admin/group-deals` | 공구 CRUD |
| POST | `/admin/group-deals/:id/receipt` | 영수증 업로드 (AI stub) |

### 발표 **안 씀** (Red/Yellow)

| Method | 경로 |
|--------|------|
| GET | `/store/products/search-index` (Flask용) |
| POST | `/store/group-deals/:id/waitlist` |
| POST | `/store/me/group-deals/:id/apply-price-recommendations` |
| GET | `/api/ai/search` (BFF) |

---

## Part 5. 30초 프로젝트 설명 (외워두기)

> K-POP 굿즈 **공동구매** 서비스입니다. **총대**가 공구를 열고, **멤버별 자리**를 고른 뒤 **최소 인원**이 모이면 진행됩니다.  
> **Medusa**로 주문·결제·재고를, **Next.js**로 화면을, (선택) **Flask**로 검색·추천을 나눴습니다.  
> 오늘은 **참여 → 가상계좌 입금 안내**까지 보여드리고, 실제 은행 자동 확인은 다음 단계입니다.

---

## Part 6. 미팅 후 메모란

| 질문 | 받은 답 / 액션 |
|------|----------------|
| 1. 기동 순서·자주 틀리는 설정 | |
| 2. stub 입금 OK? 수동 방법 | |
| 3. Admin 최소 체크리스트 | |
| 4. 실결제 1순위 | |
| 5. Red 외에 더 피할 것 | |

---

*관련: [TECH_REVIEW_MEETING.md](./TECH_REVIEW_MEETING.md) · [README.md](../README.md)*
