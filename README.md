# Group Buying Site (공동구매몰)

Medusa v2 + Next.js 15 기반 **K-POP 굿즈 / 공동구매** 플랫폼입니다.

- **쇼핑몰 (고객 화면):** `http://localhost:8000/kr`
- **관리자 (Admin):** `http://localhost:9000/app` ← `/app` 경로 필수
- **백엔드 API:** `http://localhost:9000`

> `http://localhost:9000/` 루트에서 `Cannot GET /`가 보이면 **정상**입니다. API 서버라 루트 페이지가 없고, Admin은 `/app`으로 접속합니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| 공동구매 | 목표 인원 달성 시 할인가 적용 (`/group-buying/[id]`) |
| 수요조사 | 상품 상세 타임라인에서 관심 표시 참여 |
| 아이돌 굿즈 UI | 제작 타임라인, 실시간 참여율, 특전 해금 게이지 |
| 6개국어 UI | 한국어, 영어, 스페인어, 러시아어, 중국어, 일본어 |
| 상품명 원본 고정 | K-POP 고유명사 보호 — 상품명은 Admin 등록 그대로 표시 |
| 일반 커머스 | 장바구니, 결제(Stripe), 계정, 주문 (Medusa 기본) |

---

## 프로젝트 구조

```
group-buying-site/
├── apps/
│   ├── backend/                 # Medusa v2 백엔드
│   │   └── src/
│   │       ├── modules/group-buying/   # 공동구매 커스텀 모듈
│   │       ├── workflows/              # 공동구매·수요조사 워크플로
│   │       ├── api/                    # Admin / Store API 라우트
│   │       └── scripts/seed-locales.ts # 다국어 로케일 시드
│   └── storefront/              # Next.js 15 스토어프론트
│       └── src/
│           ├── app/                    # App Router 페이지
│           ├── i18n/                   # 6개국어 사전
│           ├── lib/data/               # 서버 데이터 레이어
│           └── modules/                # UI 컴포넌트
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
├── CODE_ANALYSIS.md           # 코드 분석 보고서
└── DEPLOYMENT.md              # 배포 가이드
```

---

## 시작하기 (팀원용)

### 필요 환경

- **Node.js** v20 이상
- **PostgreSQL** v15 이상
- **pnpm** v10 이상

### 1. 저장소 클론 및 의존성 설치

```bash
git clone https://github.com/<본인아이디>/group_buying.git
cd group_buying
pnpm install
```

### 2. 백엔드 환경 설정

```bash
cp apps/backend/.env.template apps/backend/.env
```

`apps/backend/.env`에서 `DATABASE_URL`을 본인 PostgreSQL에 맞게 수정:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/group_buying
```

### 3. DB 마이그레이션 및 관리자 계정

```bash
cd apps/backend
pnpm db:migrate
pnpm medusa user -e admin@test.com -p supersecret
pnpm seed:locales
```

### 4. 백엔드 실행

```bash
cd apps/backend
pnpm dev
```

`Server is ready on port 9000` 메시지 확인 후 Admin 접속: **http://localhost:9000/app**

### 5. 스토어프론트 환경 설정

```bash
cp apps/storefront/.env.template apps/storefront/.env.local
```

Admin (`/app`) → Settings → Publishable API Keys에서 키 발급 후 `.env.local`에 설정:

```env
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_DEFAULT_REGION=kr
NEXT_PUBLIC_BASE_URL=http://localhost:8000
```

### 6. 스토어프론트 실행

```bash
cd apps/storefront
pnpm dev
```

쇼핑몰 접속: **http://localhost:8000/kr**

### 루트에서 동시 실행 (선택)

```bash
# group-buying-site 루트에서
pnpm dev
```

---

## Admin에서 상품·수요조사 설정

상품 Metadata에 아래 값을 설정하면 아이돌 굿즈 UI가 동작합니다.

| Metadata 키 | 값 예시 | 설명 |
|-------------|---------|------|
| `production_stage` | `demand_survey` | 제작 단계 (수요조사/선입금/일반입금/제작중/배송) |
| `participation_current` | `42` | 현재 참여 인원 |
| `participation_target` | `100` | 목표 인원 |

`production_stage` 값:

- `demand_survey` — 수요조사
- `pre_deposit` — 선입금 진행
- `general_deposit` — 일반입금
- `in_production` — 제작 진행 중
- `shipping` — 배송 시작

---

## API 엔드포인트 요약

### Store (공개)

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/store/group-deals` | 공동구매 목록 |
| GET | `/store/group-deals/:id` | 공동구매 상세 |
| POST | `/store/group-deals/:id/join` | 공동구매 참여 |
| POST | `/store/products/:id/demand-survey/participate` | 수요조사 참여 |

### Admin

| Method | 경로 | 설명 |
|--------|------|------|
| GET | `/admin/group-deals` | 공동구매 목록 |
| POST | `/admin/group-deals` | 공동구매 생성 |
| GET | `/admin/group-deals/:id` | 공동구매 상세 |

---

## GitHub에 올릴 때 주의

### 올려야 하는 것

- 소스 코드 전체 (`apps/`, `package.json`, `pnpm-lock.yaml` 등)
- `.env.template` 파일들
- `README.md`, `CODE_ANALYSIS.md`, `DEPLOYMENT.md`

### 절대 올리면 안 되는 것

| 파일 | 이유 |
|------|------|
| `apps/backend/.env` | DB 비밀번호, JWT 시크릿 |
| `apps/storefront/.env.local` | Publishable API Key |
| `node_modules/` | `pnpm install`로 재생성 |
| `.next/`, `build/`, `dist/` | 빌드 결과물 |

`.gitignore`에 이미 제외 설정되어 있습니다. `git add .` 전에 `git status`로 `.env` 파일이 없는지 확인하세요.

### GitHub 업로드 명령어

```bash
cd group-buying-site
git init
git add .
git commit -m "Initial commit: group buying site"
git branch -M main
git remote add origin https://github.com/<본인아이디>/group_buying.git
git push -u origin main
```

---

## 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| 백엔드 | Medusa | 2.17.2 |
| 스토어프론트 | Next.js | 15.5.18 |
| UI | React | 19.0.5 |
| 스타일 | Tailwind CSS | 3.x |
| DB | PostgreSQL | 15+ |
| 패키지 매니저 | pnpm | 10.11.1 |

---

## 문서

- **[CODE_ANALYSIS.md](./CODE_ANALYSIS.md)** — 코드 구조·데이터 흐름·개선 포인트 분석 보고서
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Vercel + Railway/Render 배포 가이드

---

## 알려진 제한사항

- `/group-buying` 목록 페이지는 공동구매 API가 아닌 **전체 출판 상품**을 표시합니다.
- 공동구매 참여 시 **결제/주문은 생성되지 않습니다** (이메일·수량만 기록).
- Admin UI에서 공동구매를 관리하는 화면은 아직 없습니다 (API로만 생성 가능).
- 상품 설명 번역은 외국어 선택 시 MyMemory API를 사용합니다 (한국어일 때는 원본 표시).

---

## 라이선스

MIT (Medusa 스타터 기반)
