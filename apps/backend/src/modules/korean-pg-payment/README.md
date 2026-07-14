# Korean PG Payment Provider (토스페이먼츠 / 포트원)

Medusa v2 커스텀 결제 프로바이더 스켈레톤입니다.

> **참고:** Medusa v1의 `AbstractPaymentService`는 v2에서 `AbstractPaymentProvider`로 대체되었습니다.

## 파일 구조

```
apps/backend/src/modules/korean-pg-payment/
├── index.ts       # ModuleProvider 등록
├── service.ts     # AbstractPaymentProvider 구현체
├── client.ts      # PG사 API 클라이언트 스켈레톤
├── types.ts       # 옵션/세션/웹훅 타입
└── README.md
```

## medusa-config.ts 등록

`apps/backend/medusa-config.ts`의 `modules` 배열에 Payment 모듈 설정을 추가합니다.

```ts
{
  resolve: "@medusajs/medusa/payment",
  options: {
    providers: [
      {
        resolve: "./src/modules/korean-pg-payment",
        id: "korean-pg",
        options: {
          vendor: process.env.KOREAN_PG_VENDOR || "toss",
          tossSecretKey: process.env.TOSS_SECRET_KEY,
          tossClientKey: process.env.TOSS_CLIENT_KEY,
          portoneApiKey: process.env.PORTONE_API_KEY,
          portoneApiSecret: process.env.PORTONE_API_SECRET,
          portoneStoreId: process.env.PORTONE_STORE_ID,
          webhookSecret: process.env.KOREAN_PG_WEBHOOK_SECRET,
          testMode: process.env.KOREAN_PG_TEST_MODE === "true",
        },
      },
    ],
  },
},
```

등록 후 Medusa 내부 provider_id:

```
pp_korean-pg_korean-pg
```

(`pp_{identifier}_{config.id}` 형식)

## 환경 변수 (.env)

```env
KOREAN_PG_VENDOR=toss
TOSS_SECRET_KEY=test_sk_...
TOSS_CLIENT_KEY=test_ck_...
KOREAN_PG_WEBHOOK_SECRET=whsec_...
KOREAN_PG_TEST_MODE=true
```

포트원 사용 시:

```env
KOREAN_PG_VENDOR=portone
PORTONE_API_KEY=...
PORTONE_API_SECRET=...
PORTONE_STORE_ID=...
KOREAN_PG_WEBHOOK_SECRET=...
```

## Admin에서 리전에 활성화

1. `pnpm dev`로 백엔드 실행
2. Admin (`http://localhost:9000/app`) → Settings → Regions
3. Korea 리전 편집 → Payment Providers에서 **korean-pg** 활성화

## 웹훅 URL

Medusa 기본 웹훅 라우트:

```
POST https://<backend-domain>/hooks/payment/korean-pg
```

PG사 관리자 콘솔에 위 URL을 등록하고, `KOREAN_PG_WEBHOOK_SECRET`으로 서명 검증을 설정하세요.

### 웹훅 처리 흐름

1. `POST /hooks/payment/korean-pg` 수신
2. `KoreanPgWebhookHandler`가 PG 서명 검증 (토스 HMAC / 포트원 SHA256)
3. 성공 알림 시 DB 주문·결제 세션 금액과 웹훅 금액 대조
4. 금액 일치 시에만 Medusa `process-payment` 워크플로로 결제 완료 처리
5. 금액 불일치 또는 취소 알림 시 `korean-pg-webhook-safeguard` 워크플로로 PG 취소 + 결제 세션/주문 안전장치 실행

테스트 모드 서명 헤더 예시:

```
tosspayments-signature: test_signature
```

또는 `createTestWebhookSignature(rawBody, KOREAN_PG_WEBHOOK_SECRET)` 값 사용

## 주요 메서드 (service.ts)

| Medusa 메서드 | 역할 |
|---------------|------|
| `initiatePayment` | 결제 세션 생성 |
| `authorizePayment` | 결제 승인(confirm) |
| `cancelPayment` | 결제 취소 |
| `getWebhookActionAndData` | 웹훅 이벤트 처리 |
| `capturePayment` | 결제 캡처 |
| `refundPayment` | 환불 |

## 공동구매 빌링키(예약 결제) 연동

공동구매 참여 시 즉시 결제하지 않고 빌링키만 발급·저장한 뒤, 목표 인원 달성 시 일괄 캡처합니다.

### API 흐름

1. `POST /store/group-deals/:id/join` — 참여자 생성 + PG 빌링 인증 세션 반환 (`billing_session`)
2. 스토어프론트 PG 위젯으로 빌링키 발급
3. `POST /store/group-deals/:id/billing-key` — 빌링키를 AES-256-GCM 암호화 후 참여자 레코드에 저장 (`status: reserved`)
4. 최소 인원 달성 시 `captureGroupDealPayments`가 저장된 빌링키로 PG 캡처 API 일괄 호출
5. (관리자) `POST /admin/group-deals/:id/capture-payments` — 수동 재시도

### client.ts 빌링 메서드

| 메서드 | 역할 |
|--------|------|
| `createBillingAuthSession` | 빌링키 발급용 인증 세션 |
| `issueBillingKey` | PG 빌링키 발급 |
| `captureWithBillingKey` | 빌링키로 실결제 승인(Capture) |

### 환경 변수 (빌링키)

```env
BILLING_KEY_ENCRYPTION_SECRET=...
PG_CAPTURE_MAX_RETRIES=3
```

## 다음 구현 단계

1. `client.ts`에 토스/포트원 실제 API 호출 구현 (빌링키 발급·캡처 포함)
2. 스토어프론트에 빌링키 등록 UI 연동 (`billing_session` 사용)
3. `authorizePayment`에 스토어프론트에서 전달한 `paymentKey` / `billingKey` 연결
4. 웹훅 서명 검증 및 이벤트 타입 매핑 완성
