FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

# Development
FROM base AS development
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm","run","dev"]


# Builder
FROM base AS builder
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build


# Production
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node","dist/server.js"]