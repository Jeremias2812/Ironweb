-- =========================================================
-- Supabase / Postgres schema
-- App Herramientas (Oil & Gas)
-- =========================================================
-- Ejecutar este script en SQL Editor de Supabase.
-- Es idempotente en gran parte (usa IF NOT EXISTS / guards).

create extension if not exists pgcrypto;

-- =========================
-- Enums
-- =========================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tool_status') then
    create type tool_status as enum ('available', 'in_use', 'maintenance', 'retired');
  end if;

  if not exists (select 1 from pg_type where typname = 'warehouse_type') then
    create type warehouse_type as enum ('field_team', 'maintenance_center', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'remito_status') then
    create type remito_status as enum ('draft', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'wo_status') then
    create type wo_status as enum ('open', 'in_progress', 'closed');
  end if;
end $$;

-- =========================
-- Tablas
-- =========================
create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type warehouse_type not null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tools (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  status tool_status not null default 'available',
  warehouse_id uuid references warehouses(id),
  usage_hours numeric(12,2) not null default 0,
  next_maintenance_hours numeric(12,2) not null default 100,
  internal_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_tools_usage_hours_non_negative check (usage_hours >= 0),
  constraint chk_tools_next_maintenance_non_negative check (next_maintenance_hours >= 0)
);

create table if not exists remitos (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  origin_id uuid not null references warehouses(id),
  destination_id uuid not null references warehouses(id),
  status remito_status not null default 'draft',
  notes text,
  closed_by uuid,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_remitos_origin_dest_different check (origin_id <> destination_id)
);

create table if not exists remito_lines (
  id uuid primary key default gen_random_uuid(),
  remito_id uuid not null references remitos(id) on delete cascade,
  tool_id uuid not null references tools(id),
  usage_delta numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (remito_id, tool_id),
  constraint chk_remito_lines_usage_delta_non_negative check (usage_delta >= 0)
);

create table if not exists tool_movements (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references tools(id),
  remito_id uuid not null references remitos(id),
  from_warehouse_id uuid references warehouses(id),
  to_warehouse_id uuid references warehouses(id),
  usage_delta numeric(12,2) not null default 0,
  moved_by uuid,
  created_at timestamptz not null default now(),
  constraint chk_tool_movements_usage_delta_non_negative check (usage_delta >= 0)
);

create table if not exists work_orders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  tool_id uuid not null references tools(id),
  status wo_status not null default 'open',
  opened_by uuid,
  closed_by uuid,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  tool_id uuid not null references tools(id),
  note text not null,
  hours_spent numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint chk_maintenance_logs_hours_non_negative check (hours_spent >= 0)
);

-- =========================
-- Índices
-- =========================
create index if not exists idx_tools_status on tools(status);
create index if not exists idx_tools_warehouse_id on tools(warehouse_id);
create index if not exists idx_tools_next_maintenance_hours on tools(next_maintenance_hours);
create index if not exists idx_remitos_status on remitos(status);
create index if not exists idx_remitos_origin_id on remitos(origin_id);
create index if not exists idx_remitos_destination_id on remitos(destination_id);
create index if not exists idx_remito_lines_remito_id on remito_lines(remito_id);
create index if not exists idx_remito_lines_tool_id on remito_lines(tool_id);
create index if not exists idx_tool_movements_tool_id on tool_movements(tool_id);
create index if not exists idx_tool_movements_remito_id on tool_movements(remito_id);
create index if not exists idx_work_orders_status on work_orders(status);
create index if not exists idx_work_orders_tool_id on work_orders(tool_id);
create index if not exists idx_maintenance_logs_wo_id on maintenance_logs(work_order_id);

-- =========================
-- Trigger updated_at genérico
-- =========================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_warehouses_updated_at on warehouses;
create trigger trg_warehouses_updated_at
before update on warehouses
for each row execute function set_updated_at();

drop trigger if exists trg_tools_updated_at on tools;
create trigger trg_tools_updated_at
before update on tools
for each row execute function set_updated_at();

drop trigger if exists trg_remitos_updated_at on remitos;
create trigger trg_remitos_updated_at
before update on remitos
for each row execute function set_updated_at();

drop trigger if exists trg_work_orders_updated_at on work_orders;
create trigger trg_work_orders_updated_at
before update on work_orders
for each row execute function set_updated_at();

-- =========================
-- RPC: close_remito
-- - Cierra remito
-- - Mueve ubicación herramienta
-- - Suma horas de uso (delta)
-- - Registra historial tool_movements
-- =========================
create or replace function close_remito(p_remito_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status remito_status;
  v_origin uuid;
  v_dest uuid;
  v_line record;
begin
  select status, origin_id, destination_id
    into v_status, v_origin, v_dest
  from remitos
  where id = p_remito_id
  for update;

  if not found then
    raise exception 'Remito no encontrado: %', p_remito_id;
  end if;

  if v_status = 'closed' then
    raise exception 'El remito ya está cerrado: %', p_remito_id;
  end if;

  for v_line in
    select rl.tool_id, rl.usage_delta
    from remito_lines rl
    where rl.remito_id = p_remito_id
  loop
    update tools t
       set warehouse_id = v_dest,
           usage_hours = t.usage_hours + coalesce(v_line.usage_delta, 0),
           status = case when t.status = 'retired' then 'retired' else 'in_use' end
     where t.id = v_line.tool_id;

    insert into tool_movements(tool_id, remito_id, from_warehouse_id, to_warehouse_id, usage_delta, moved_by)
    values (v_line.tool_id, p_remito_id, v_origin, v_dest, coalesce(v_line.usage_delta, 0), p_user_id);
  end loop;

  update remitos
     set status = 'closed',
         closed_by = p_user_id,
         closed_at = now()
   where id = p_remito_id;
end;
$$;

-- =========================
-- RPC: set_work_order_status
-- - open/in_progress => tool => maintenance
-- - closed => tool => available
-- =========================
create or replace function set_work_order_status(p_wo_id uuid, p_status wo_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tool_id uuid;
begin
  update work_orders
     set status = p_status,
         closed_at = case when p_status = 'closed' then now() else null end
   where id = p_wo_id
   returning tool_id into v_tool_id;

  if not found then
    raise exception 'OT no encontrada: %', p_wo_id;
  end if;

  if p_status in ('open', 'in_progress') then
    update tools set status = 'maintenance' where id = v_tool_id and status <> 'retired';
  elsif p_status = 'closed' then
    update tools set status = 'available' where id = v_tool_id and status <> 'retired';
  end if;
end;
$$;

-- =========================
-- Views útiles para dashboard
-- =========================
create or replace view vw_dashboard_metrics as
select
  (select count(*) from tools) as total_tools,
  (select count(*) from remitos where status = 'draft') as remitos_open,
  (select count(*) from work_orders where status = 'open') as wo_open,
  (select count(*) from work_orders where status = 'in_progress') as wo_in_progress,
  (select count(*) from tools where next_maintenance_hours = 0) as maintenance_due_now,
  (select count(*) from tools where next_maintenance_hours between 1 and 20) as maintenance_due_soon;

-- =========================
-- RLS básicas (auth users)
-- =========================
alter table warehouses enable row level security;
alter table tools enable row level security;
alter table remitos enable row level security;
alter table remito_lines enable row level security;
alter table tool_movements enable row level security;
alter table work_orders enable row level security;
alter table maintenance_logs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'warehouses' and policyname = 'warehouses_auth_all') then
    create policy warehouses_auth_all on warehouses
      for all
      using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;

  if not exists (select 1 from pg_policies where tablename = 'tools' and policyname = 'tools_auth_all') then
    create policy tools_auth_all on tools
      for all
      using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;

  if not exists (select 1 from pg_policies where tablename = 'remitos' and policyname = 'remitos_auth_all') then
    create policy remitos_auth_all on remitos
      for all
      using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;

  if not exists (select 1 from pg_policies where tablename = 'remito_lines' and policyname = 'remito_lines_auth_all') then
    create policy remito_lines_auth_all on remito_lines
      for all
      using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;

  if not exists (select 1 from pg_policies where tablename = 'tool_movements' and policyname = 'tool_movements_auth_all') then
    create policy tool_movements_auth_all on tool_movements
      for all
      using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;

  if not exists (select 1 from pg_policies where tablename = 'work_orders' and policyname = 'work_orders_auth_all') then
    create policy work_orders_auth_all on work_orders
      for all
      using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;

  if not exists (select 1 from pg_policies where tablename = 'maintenance_logs' and policyname = 'maintenance_logs_auth_all') then
    create policy maintenance_logs_auth_all on maintenance_logs
      for all
      using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;
end $$;

-- =========================
-- Permisos mínimos para RPC + view
-- =========================
grant select on vw_dashboard_metrics to authenticated;
grant execute on function close_remito(uuid, uuid) to authenticated;
grant execute on function set_work_order_status(uuid, wo_status) to authenticated;

-- Fin.
