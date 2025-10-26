
# Iron Web MVP (Solo Web + PWA + IA mínima)

Stack:
- Next.js (App Router, TS) + Tailwind
- Supabase (Auth/DB/Storage) con RLS
- PWA (service worker + manifest)
- Chat IA (stub) con RAG (placeholder)

## 1) Requisitos
- Node 18+
- Cuenta de Supabase
- (Opcional) Clave de OpenAI/LLM

## 2) Setup rápido
```bash
pnpm i # o npm i / yarn
cp .env.example .env
# Completa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
# Completa OPENAI_API_KEY si quieres habilitar el chat IA
```

### Activar PWA en desarrollo
Next servirá /sw.js y /manifest.json; asegúrate de usar http://localhost:3000 y recargar.

## 3) Ejecutar
```bash
npm run dev
# abre http://localhost:3000
```

## 4) Estructura
- app/: páginas y API routes
- lib/: supabase client y RAG stub
- public/: manifest + service worker + iconos
- db/schema.sql: tablas iniciales + RLS de ejemplo

## 5) Siguientes pasos
- Completar CRUD contra Supabase (pages: /parts, /work-orders).
- Implementar RBAC con RLS (ver db/schema.sql) y policies por rol.
- Añadir subida de fotos y escaneo QR (zxing) en /parts.
- Implementar certificados PDF (ej. via @react-pdf/renderer o Puppeteer).
- Conectar RAG a pgvector: generar embeddings y búsquedas top-k.

## 6) Seguridad
- Usa RLS en cada tabla.
- Añade auditoría en writes.
- Limita costos del LLM (rate limit y logging).
# iron-web-mvp
