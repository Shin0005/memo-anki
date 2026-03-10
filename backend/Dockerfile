FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["sh", "-c", "npx prisma generate && npm run start:dev"]