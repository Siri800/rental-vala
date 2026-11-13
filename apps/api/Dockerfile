FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm --filter @rental-vala/database generate
RUN pnpm --filter @rental-vala/api build

EXPOSE 8085
CMD ["node", "apps/api/dist/server.js"]
