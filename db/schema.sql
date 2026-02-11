create extension if not exists pgcrypto;

-- Enums
create type tool_status as enum ('available', 'in_use', 'maintenance', 'retired');
create type remito_status as enum ('draft', 'closed');
create type wo_status as enum ('open', 'in_progress', 'closed');
create type warehouse_type as enum ('field_team', 'maintenance_center', 'other');

-- Core tables
create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type warehouse_type not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists tools (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  status tool_status not null default 'available',
  warehouse_id uuid references warehouses(id),
  usage_hours numeric(10,2) not null default 0,
  next_maintenance_hours numeric(10,2) not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists remitos (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  origin_id uuid not null references warehouses(id),
  destination_id uuid not null references warehouses(id),
  status remito_status not null default 'draft',
  closed_by uuid,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists remito_lines (
  id uuid primary key default gen_random_uuid(),
  remito_id uuid not null references remitos(id) on delete cascade,
  tool_id uuid not null references tools(id),
  usage_delta numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (remito_id, tool_id)
);

create table if not exists tool_movements (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references tools(id),
  remito_id uuid not null references remitos(id),
  from_warehouse_id uuid references warehouses(id),
  to_warehouse_id uuid references warehouses(id),
  usage_delta numeric(10,2) not null default 0,
  moved_by uuid,
  created_at timestamptz not null default now()
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
  closed_at timestamptz
);

create table if not exists maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  tool_id uuid not null references tools(id),
  note text not null,
  hours_spent numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_tools_status on tools(status);
create index if not exists idx_tools_warehouse_id on tools(warehouse_id);
create index if not exists idx_remitos_status on remitos(status);
create index if not exists idx_remito_lines_remito_id on remito_lines(remito_id);
create index if not exists idx_tool_movements_tool_id on tool_movements(tool_id);
create index if not exists idx_work_orders_status on work_orders(status);
create index if not exists idx_maintenance_logs_wo_id on maintenance_logs(work_order_id);

-- Triggers for updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tools_updated_at on tools;
create trigger trg_tools_updated_at
before update on tools
for each row execute function set_updated_at();

-- RPC: close remito
create or replace function close_remito(p_remito_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
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
    raise exception 'Remito no encontrado';
  end if;

  if v_status = 'closed' then
    raise exception 'El remito ya está cerrado';
  end if;

  for v_line in
    select tool_id, usage_delta from remito_lines where remito_id = p_remito_id
  loop
    update tools
      set warehouse_id = v_dest,
          usage_hours = usage_hours + coalesce(v_line.usage_delta, 0)
    where id = v_line.tool_id;

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

-- RPC: set work order status
create or replace function set_work_order_status(p_wo_id uuid, p_status wo_status)
returns void
language plpgsql
security definer
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
    raise exception 'OT no encontrada';
  end if;

  if p_status in ('open', 'in_progress') then
    update tools set status = 'maintenance' where id = v_tool_id;
  elsif p_status = 'closed' then
    update tools set status = 'available' where id = v_tool_id;
  end if;
end;
$$;

-- RLS basic policies for authenticated users
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
    create policy warehouses_auth_all on warehouses for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'tools' and policyname = 'tools_auth_all') then
    create policy tools_auth_all on tools for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'remitos' and policyname = 'remitos_auth_all') then
    create policy remitos_auth_all on remitos for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'remito_lines' and policyname = 'remito_lines_auth_all') then
    create policy remito_lines_auth_all on remito_lines for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'tool_movements' and policyname = 'tool_movements_auth_all') then
    create policy tool_movements_auth_all on tool_movements for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'work_orders' and policyname = 'work_orders_auth_all') then
    create policy work_orders_auth_all on work_orders for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'maintenance_logs' and policyname = 'maintenance_logs_auth_all') then
    create policy maintenance_logs_auth_all on maintenance_logs for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
  end if;
end $$;
