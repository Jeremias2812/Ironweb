# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder

# Allow the build to succeed even when callers forget to forward Supabase
# credentials.  We provide safe placeholder defaults that can be overridden via
# --build-arg and expose them as environment variables so Next.js can read them
# during the build step.  Si estás resolviendo un conflicto de merge, mantén esta
# sección completa para preservar la estructura multi-etapa.
ARG NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY="dev-anon-key"
ARG SUPABASE_SERVICE_ROLE_KEY=""
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production

ARG NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY="dev-anon-key"
ARG SUPABASE_SERVICE_ROLE_KEY=""
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000
CMD ["npm", "run", "start"]
