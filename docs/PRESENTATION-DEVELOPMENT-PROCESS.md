# PokaCatch (포카캐치) — 개발 과정 (발표용)

> PPT 슬라이드용 8단계 표 · 2026-07-23

## 개발 과정 요약 표

| 단계 | 단계명 | 목표 | 사용 기술 | 구현한 주요 기능 |
|:---:|--------|------|-----------|-----------------|
| **1** | **프로젝트 기반 및 Medusa 백엔드 구축** | Medusa v2 모노레포·DB·커스텀 모듈 골격 확립 | Medusa 2.17.2, pnpm workspace + Turbo, PostgreSQL 15+, Node.js 20+ | `@dtc/backend`, group-buying 모듈 5개 엔티티, 마이그레이션·시드, Medusa Admin |
| **2** | **Next.js 스토어프론트 및 다국어 UI** | 공개·계정 UI와 6개국어 i18n 구축 | Next.js 15.5.18 (App Router), React 19, Medusa JS SDK | `(landing)` 랜딩, `(main)` 계정·상품, 6개 로케일 (ko/en/es/ru/zh/ja) |
| **3** | **공동구매 도메인 모듈 및 Admin** | K-POP 굿즈 공동구매 도메인 모델링 | MedusaService, Zod validators, Admin React UI | GroupDealStatus 상태 머신, GroupDealOption 멤버/버전 선택, Admin CRUD·Verify Receipt |
| **4** | **결제 시스템 연동 (Toss / Stripe)** | 한국·해외 결제 및 v3 이중 결제 경로 | Toss Payments, Stripe, group-deal-billing workflow | VA 경로(5분 기한), 레거시 PG checkout, 총대 보증금, KRW 전용 |
| **5** | **GB App 및 참여·총대 운영 플로우** | 참여자·총대 10단계 운영 흐름·에스크로 | `(gb-app)` Route Group, group-deal-escrow, Cron | APLY→CHKO→MYJN, waitlist 매칭, 총대 10단계(PURC~RPTG), SRCH 필터 |
| **6** | **Document AI 검증 (Upstage / BFF)** | 영수증·송장 OCR 자동화 | Flask BFF, Upstage OCR, R2/S3 | receipt/parse, tracking/parse, 4항목 검증, 수동 입력·수정(receipt/confirm) |
| **7** | **PokaCatch 브랜딩 및 UX 고도화** | 서비스 정체성·운영 UX 개선 | i18n, PokaCatch SVG 로고, Server Action `{ ok, error }` | BiasBuy→PokaCatch 리브랜딩, 발송·정산 API, 정산 계좌 UI, 오류 UX |
| **8** | **프로덕션 배포 (Vercel / Render)** | 3-tier 클라우드 운영 | Vercel, Render, Docker, Cloudflare R2 | Storefront(Vercel), Medusa+BFF(Render), R2 미디어, Render TS 빌드 안정화 |

## Git 주요 마일스톤

| 시점 | 이벤트 |
|------|--------|
| 초기 | `Initial commit: group buying site` |
| 결제 v2 | 공동구매 결제 연동, 장바구니·결제 i18n |
| 2026-07-20 | GB App, apply API, SRCH 필터, KRW-only |
| 2026-07-21 | Document AI, shipping, settlement 전체 동기화 |
| 2026-07-23 | 영수증 수동 입력, PokaCatch 리브랜딩, 로고 |

## 프로덕션 URL

| 서비스 | URL |
|--------|-----|
| 스토어프론트 | https://group-buying-storefront-black.vercel.app |
| Medusa API | https://group-buying-2hlq.onrender.com |
| Document AI BFF | https://group-buying-document-ai-bff.onrender.com |

## 발표용 한 줄 요약

**PokaCatch**는 Medusa v2 커스텀 모듈 위에 K-POP 공동구매 도메인(총대 보증금·가상계좌·waitlist·10단계 총대 플로우)을 구현하고, Upstage Document AI(BFF)로 영수증·송장을 검증하며, Vercel+Render 3-tier로 프로덕션 운영 중인 플랫폼입니다.

## 관련 문서

- [PRESENTATION-ERD.md](./PRESENTATION-ERD.md) — ERD
- [PRESENTATION-DFD.md](./PRESENTATION-DFD.md) — DFD
- [MODULES.md](./MODULES.md) — 시스템 아키텍처
- [PROJECT_STATUS.md](../PROJECT_STATUS.md) — 구현 현황
