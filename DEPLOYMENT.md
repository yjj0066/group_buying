# 배포 가이드

로컬 개발과 프로덕션 배포를 분리해 두었습니다. **도메인·DB URL은 배포할 때 플랫폼에 입력**하면 됩니다.

## 환경 파일 구조

| 파일 | 용도 |
|------|------|
| `apps/backend/.env` | 로컬 개발 (git 제외) |
| `apps/backend/.env.production.template` | 백엔드 배포 시 참고 |
| `apps/storefront/.env.local` | 로컬 개발 (git 제외) |
| `apps/storefront/.env.production.template` | 스토어프론트 배포 시 참고 |

로컬에서는 기존처럼 `.env` / `.env.local`만 쓰면 됩니다.  
프로덕션(`NODE_ENV=production`)에서는 필수 환경 변수가 없으면 앱이 시작되지 않습니다.

---

## 추천 배포 구성

```
Vercel          → apps/storefront (고객 화면)
Railway/Render  → apps/backend (Medusa API + Admin)
Supabase/Neon   → PostgreSQL
Upstash         → Redis (선택, 권장)
```

---

## 1. 데이터베이스 (PostgreSQL)

1. [Supabase](https://supabase.com) 또는 [Neon](https://neon.tech)에서 프로젝트 생성
2. Connection string 복사
3. 백엔드 환경 변수 `DATABASE_URL`에 설정

배포 후 한 번만 마이그레이션:

```bash
cd apps/backend
pnpm medusa db:migrate
pnpm medusa user -e admin@yourdomain.com -p <strong-password>
```

---

## 2. 백엔드 배포 (Railway / Render / Docker)

### 환경 변수 (`apps/backend/.env.production.template` 참고)

| 변수 | 예시 |
|------|------|
| `DATABASE_URL` | `postgres://...` |
| `JWT_SECRET` | `openssl rand -hex 32` 로 생성 |
| `COOKIE_SECRET` | `openssl rand -hex 32` 로 생성 |
| `STORE_CORS` | `https://your-storefront.com` |
| `ADMIN_CORS` | `https://your-backend.onrender.com` |
| `AUTH_CORS` | `https://your-backend.onrender.com` |
| `REDIS_URL` | Upstash Redis URL (권장) |
| `MEDUSA_WORKER_MODE` | `shared` (소규모) |

### Docker로 직접 배포

```bash
# monorepo 루트에서
docker build -f apps/backend/Dockerfile -t group-buying-backend .
docker run -p 9000:9000 --env-file apps/backend/.env.production group-buying-backend
```

### Render

루트의 `render.yaml`을 Render Blueprint로 import할 수 있습니다.  
`STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`는 실제 URL로 수정하세요.

---

## 3. 스토어프론트 배포 (Vercel)

1. GitHub에 `group-buying-site` 푸시
2. [Vercel](https://vercel.com) → New Project → repo 선택
3. **Root Directory**: `apps/storefront`
4. Environment Variables 설정:

| 변수 | 값 |
|------|-----|
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Admin에서 발급한 pk_... |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | 배포된 백엔드 URL |
| `NEXT_PUBLIC_BASE_URL` | Vercel 도메인 (예: https://xxx.vercel.app) |
| `NEXT_PUBLIC_DEFAULT_REGION` | `kr` 등 |
| `NODE_ENV` | `production` |

5. Deploy

`apps/storefront/vercel.json`에 빌드 설정이 포함되어 있습니다.

---

## 4. 배포 후 체크리스트

- [ ] Admin (`https://your-backend.com/app`) 로그인 가능
- [ ] Publishable API Key 생성 후 Vercel에 반영
- [ ] CORS에 스토어프론트·백엔드 URL 모두 포함
- [ ] `https://your-storefront.com/dk/group-buying` 페이지 로드
- [ ] JWT/COOKIE 시크릿이 `dev-...` / `supersecret`이 **아닌지** 확인

---

## 로컬 vs 프로덕션 동작 차이

| 항목 | 로컬 | 프로덕션 |
|------|------|----------|
| DB SSL | 비활성 | 자동 활성 (`DATABASE_SSL=false`로 끌 수 있음) |
| Redis | 선택 (없으면 in-memory) | URL 설정 권장 |
| API URL | localhost 기본값 | 환경 변수 필수 |
| 이미지 도메인 | localhost | `NEXT_PUBLIC_MEDUSA_BACKEND_URL` 호스트 자동 허용 |

---

## Medusa Cloud (대안)

인프라 관리를 줄이려면 [Medusa Cloud](https://cloud.medusajs.com)에 백엔드를 배포하고, 스토어프론트만 Vercel에 올리는 방식도 가능합니다.
