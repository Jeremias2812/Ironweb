# App Herramientas (Next.js + Supabase)

Aplicación web para Oil & Gas enfocada en inventario de herramientas, remitos/movimientos y mantenimiento.

## Stack
- Next.js 14 (App Router + TypeScript)
- Supabase (Postgres, Auth, Realtime, RPC)
- Tailwind CSS

## Variables de entorno
Crear `.env.local` con:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Base de datos
1. Abrir Supabase SQL Editor.
2. Ejecutar `db/supabase_oilgas.sql` completo (recomendado para tu nueva base).
3. (Opcional) usar `db/schema.sql` como referencia anterior.
4. Verificar que existan:
   - tablas: `warehouses`, `tools`, `remitos`, `remito_lines`, `tool_movements`, `work_orders`, `maintenance_logs`
   - RPC: `close_remito`, `set_work_order_status`

## Ejecutar local

```bash
npm install
npm run dev
```

App disponible en `http://localhost:3000`.

## Secciones implementadas
- Dashboard
- Inventario (+ detalle + alta + edición)
- Depósitos/Ubicaciones (CRUD base)
- Movimientos/Remitos (alta + cierre por RPC)
- Mantenimiento/OT (alta + cambio de estado por RPC + logs)
- Login con Supabase Auth (email/password)

## Descargar el código con modificaciones
Puedes generar un ZIP del proyecto (sin `node_modules`, `.next` y `.git`) con:

```bash
./scripts/export_project.sh
```

El archivo se guarda por defecto en `artifacts/ironweb-modificado.zip`.


## Usuario de acceso
Si no tienes usuario creado en Supabase, puedes entrar desde `/login` usando el botón **"Crear / usar usuario demo"**.

Credenciales demo:
- Email: `demo@ironweb.local`
- Password: `Demo123456!`

> Nota: si en tu proyecto Supabase está activa la confirmación de email, deberás confirmar el correo antes del primer login.

