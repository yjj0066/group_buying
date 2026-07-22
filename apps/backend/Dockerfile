# Medusa backend (monorepo)
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.11.1 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile --filter @dtc/backend...

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY . .
WORKDIR /app/apps/backend
RUN pnpm run build

# Medusa production output lives in .medusa/server (see Medusa deploy docs)
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app/server

COPY --from=builder /app/apps/backend/.medusa/server ./
RUN npm install --omit=dev

EXPOSE 9000
CMD ["sh", "-c", "npm run predeploy && npm run start"]
