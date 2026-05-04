# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# Stage 2: production
FROM node:20-alpine AS runner
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

RUN npx prisma generate
RUN mkdir -p uploads

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
