# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Build args for environment variables
ARG VITE_API_URL=http://localhost:8080

# Install pnpm
RUN corepack enable pnpm

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy packages needed for web
COPY packages/ui ./packages/ui
COPY packages/shared ./packages/shared
COPY packages/tsconfig ./packages/tsconfig
COPY apps/api ./apps/api
COPY apps/web ./apps/web

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages in order
RUN pnpm --filter @documind/shared build
RUN pnpm --filter @documind/ui build
RUN pnpm --filter @documind/api build

# Build web app with environment variable
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @documind/web build

# Production stage - nginx
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/health || exit 1
