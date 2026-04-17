FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Stage: development
FROM base AS development
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Stage: build
FROM base AS builder
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage: production
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated
RUN npm run db:generate
EXPOSE 3000
CMD ["node", "dist/server.js"]