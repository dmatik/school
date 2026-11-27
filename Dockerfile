# Stage 1: The Builder
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci
COPY app/package.json app/package-lock.json ./app/
RUN npm --prefix app ci
COPY . .
RUN npm --prefix app run build:web

# Stage 2: The Final Production Image
FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && apk del python3 make g++

# Copy only the necessary artifacts
COPY --from=builder /app/app/dist ./app/dist
COPY server ./server

# Create data directory
RUN mkdir -p data

ENV NODE_ENV=production
ENV PORT=5173
ARG APP_VERSION=0.0.0
ENV APP_VERSION=$APP_VERSION
LABEL version=$APP_VERSION

EXPOSE 5173

CMD ["node", "server/index.js"]

