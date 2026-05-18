FROM node:22

WORKDIR /app

# 依存解決に必要な package.json をまず全部コピー(キャッシュ効きやすくするため)
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/

RUN npm install

# ソースコードをコピー
COPY shared ./shared
COPY backend ./backend

# shared は dist を import するので先にビルド
RUN npm run build --workspace=@memo-anki/shared

WORKDIR /app/backend
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma generate && npm run start:dev"]