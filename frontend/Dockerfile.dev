FROM node:22

WORKDIR /app

# 依存解決に必要な package.json をまず全部コピー(キャッシュ効きやすくするため)
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY frontend/package.json frontend/

RUN npm install

# ソースコードをコピー
COPY shared ./shared
COPY frontend ./frontend

# shared は dist を import するので先にビルド
RUN npm run build --workspace=@memo-anki/shared

WORKDIR /app/frontend
CMD ["npm", "run", "dev"]