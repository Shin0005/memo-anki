# Stage 1: builder
# devDependencies含めてフル環境でビルドする
FROM node:22 AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/

RUN npm ci

COPY shared ./shared
COPY backend ./backend

RUN npx prisma generate --schema=backend/prisma/schema.prisma

RUN npm run build --workspace=@memo-anki/shared
RUN npm run build --workspace=backend

# Stage 2: runner
# 本番ランタイム。slimで軽量化、本番依存のみ
FROM node:22-slim AS runner

WORKDIR /app

# Prisma公式のDockerガイドに従い、openssl パッケージを明示的にインストールする(libssl3 が依存で入る)。
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/

RUN npm ci --omit=dev --ignore-scripts 

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

WORKDIR /app/backend

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]