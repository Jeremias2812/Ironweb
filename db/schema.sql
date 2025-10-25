
-- Habilitar pgvector (en Supabase: Database > Extensions)
create extension if not exists vector;

-- Roles base (alternativamente usar enum)
create table if not exists roles (
  id serial primary key,
  name text unique not null -- 'operator' | 'technician' | 'supervisor' | 'admin'
);

-- Usuarios (referenciando auth.users de Supabase con UUID)
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique, -- auth.users.id
  email text not null unique,
  full_name text,
  role text not null default 'operator', -- simple: usa texto; también puedes FK a roles
  created_at timestamptz default now()
);

-- Piezas
create table if not exists parts (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type text,
  client text,
  status text default 'received',
  created_by uuid references app_users(id),
  created_at timestamptz default now()
);

-- Servicios
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  part_id uuid references parts(id) on delete cascade,
  service_type text,
  priority text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Órdenes de trabajo
create table if not exists work_orders (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete cascade,
  assigned_to uuid references app_users(id),
  status text default 'planned',
  eta_hours numeric,
  spent_hours numeric,
  created_at timestamptz default now()
);

-- Tareas
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid references work_orders(id) on delete cascade,
  title text,
  status text default 'todo',
  planned_minutes int,
  spent_minutes int,
  created_at timestamptz default now()
);

-- Certificados
create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete cascade,
  pdf_url text,
  signed_by uuid references app_users(id),
  hash text,
  created_at timestamptz default now()
);

-- Despachos
create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  client text,
  destination text,
  status text default 'open',
  created_at timestamptz default now()
);

create table if not exists shipment_items (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid references shipments(id) on delete cascade,
  part_id uuid references parts(id),
  qty int default 1
);

-- Documentos para RAG (texto + embedding)
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text,
  content text,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Auditoría simple
create table if not exists audit_log (
  id bigserial primary key,
  auth_user_id uuid,
  action text,
  entity text,
  entity_id uuid,
  diff jsonb,
  created_at timestamptz default now()
);

-- RLS (ejemplo básico): habilitar y permitir acceso por usuario/rol
alter table app_users enable row level security;
alter table parts enable row level security;
alter table services enable row level security;
alter table work_orders enable row level security;
alter table tasks enable row level security;
alter table certificates enable row level security;
alter table shipments enable row level security;
alter table shipment_items enable row level security;
alter table documents enable row level security;
alter table audit_log enable row level security;

-- Políticas de ejemplo (ajusta a tu modelo real)
-- 1) app_users: cada quien ve su propio registro; admin/supervisor ven todos
create policy "app_users_select_self_or_admin"
on app_users for select
using (
  auth.uid() = auth_user_id
  or exists (select 1 from app_users au where au.auth_user_id = auth.uid() and au.role in ('admin','supervisor'))
);

create policy "app_users_update_self_or_admin"
on app_users for update
using (auth.uid() = auth_user_id or exists (select 1 from app_users au where au.auth_user_id = auth.uid() and au.role in ('admin')))
with check (auth.uid() = auth_user_id or exists (select 1 from app_users au where au.auth_user_id = auth.uid() and au.role in ('admin')));

-- 2) parts: lectura para roles ('operator','technician','supervisor','admin'); escritura operadores (creación) y asignados
create policy "parts_read_roles"
on parts for select
using (exists (select 1 from app_users au where au.auth_user_id = auth.uid() and au.role in ('operator','technician','supervisor','admin')));

create policy "parts_insert_operator"
on parts for insert
with check (exists (select 1 from app_users au where au.auth_user_id = auth.uid() and au.role in ('operator','supervisor','admin')));

create policy "parts_update_supervisor_or_creator"
on parts for update
using (
  created_by = (select id from app_users where auth_user_id = auth.uid())
  or exists (select 1 from app_users au where au.auth_user_id = auth.uid() and au.role in ('supervisor','admin'))
);

-- Replica el patrón para services/work_orders/tasks/etc. según tu necesidad.

-- Índices sugeridos
create index if not exists idx_parts_code on parts(code);
create index if not exists idx_services_part on services(part_id);
create index if not exists idx_wo_service on work_orders(service_id);
create index if not exists idx_tasks_wo on tasks(work_order_id);
create index if not exists idx_docs_embedding on documents using ivfflat (embedding vector_cosine_ops);

-- Bridge: work orders ↔ services (n..n)
create table if not exists work_order_services (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (work_order_id, service_id)
);

alter table work_order_services enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='work_order_services' and policyname='work_order_services_select') then
    create policy work_order_services_select on work_order_services for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='work_order_services' and policyname='work_order_services_insert') then
    create policy work_order_services_insert on work_order_services for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='work_order_services' and policyname='work_order_services_update') then
    create policy work_order_services_update on work_order_services for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='work_order_services' and policyname='work_order_services_delete') then
    create policy work_order_services_delete on work_order_services for delete using (true);
  end if;
end $$;