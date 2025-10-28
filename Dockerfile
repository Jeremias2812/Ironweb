# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# --- deps ---
FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

# --- builder ---
FROM base AS builder
# Vars de build (seguras por defecto; sobreescríbelas con --build-arg)
ARG NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY="dev-anon-key"
# NO expongas service role como NEXT_PUBLIC
ARG SUPABASE_SERVICE_ROLE_KEY=""
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runner minimal (standalone) ---
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Dependencias de runtime para binarios nativos (p.ej. sharp)
RUN apk add --no-cache libc6-compat

# Vars de runtime (puedes sobreescribir con -e al correr el contenedor)
ARG NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY="dev-anon-key"
ARG SUPABASE_SERVICE_ROLE_KEY=""
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# Copiamos el output standalone de Next
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Seguridad: no correr como root
USER node

EXPOSE 3000
CMD ["node", "server.js"]
