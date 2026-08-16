-- Sacha Wasi MVP schema
-- Multi-sucursal + RBAC + POS/KDS/Recetas/Inventario/Caja/Auditoría

create extension if not exists "pgcrypto";

create type public.app_role as enum (
  'admin',
  'supervisor',
  'caja',
  'cocina',
  'inventario'
);

create type public.order_status as enum (
  'recibido',
  'en_preparacion',
  'listo',
  'entregado',
  'cancelado'
);

create type public.order_channel as enum (
  'mostrador',
  'mesa',
  'takeaway',
  'delivery'
);

create type public.payment_method as enum (
  'efectivo',
  'tarjeta',
  'wallet'
);

create type public.movement_type as enum (
  'entrada',
  'salida',
  'ajuste',
  'merma',
  'venta'
);

create table public.sucursales (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  timezone text not null default 'America/Lima',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.app_role not null default 'caja',
  sucursal_id uuid references public.sucursales (id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  price numeric(12, 2) not null check (price >= 0),
  category_id uuid references public.categories (id),
  sucursal_id uuid references public.sucursales (id),
  active boolean not null default true,
  prep_minutes int not null default 10,
  created_at timestamptz not null default now()
);

create table public.insumos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null,
  unit text not null,
  cost_unit numeric(12, 4) not null default 0,
  stock numeric(14, 3) not null default 0,
  min_stock numeric(14, 3) not null default 0,
  sucursal_id uuid not null references public.sucursales (id),
  lot text,
  expiry_date date,
  created_at timestamptz not null default now(),
  unique (sku, sucursal_id)
);

create table public.recetas (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id) on delete cascade,
  name text not null,
  version int not null default 1,
  yield_portions numeric(10, 2) not null default 1,
  active boolean not null default true,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (producto_id, version)
);

create table public.receta_ingredientes (
  id uuid primary key default gen_random_uuid(),
  receta_id uuid not null references public.recetas (id) on delete cascade,
  insumo_id uuid not null references public.insumos (id),
  cantidad numeric(14, 4) not null check (cantidad > 0),
  unidad text not null
);

create table public.ordenes (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  sucursal_id uuid not null references public.sucursales (id),
  channel public.order_channel not null default 'mostrador',
  status public.order_status not null default 'recibido',
  payment_method public.payment_method not null,
  total numeric(12, 2) not null check (total >= 0),
  created_by uuid references public.profiles (id),
  station_priority int not null default 0,
  estimated_ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orden_items (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references public.ordenes (id) on delete cascade,
  producto_id uuid not null references public.productos (id),
  producto_name text not null,
  qty numeric(10, 2) not null check (qty > 0),
  unit_price numeric(12, 2) not null,
  notes text,
  modifiers jsonb not null default '[]'::jsonb,
  receta_id uuid references public.recetas (id)
);

create table public.inventario_movimientos (
  id uuid primary key default gen_random_uuid(),
  insumo_id uuid not null references public.insumos (id),
  tipo public.movement_type not null,
  cantidad numeric(14, 3) not null check (cantidad > 0),
  motivo text not null,
  referencia_id uuid,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references public.sucursales (id),
  opened_by uuid references public.profiles (id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_float numeric(12, 2) not null default 0,
  closing_amount numeric(12, 2),
  expected_cash numeric(12, 2) not null default 0,
  notes text
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id),
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index ordenes_sucursal_status_idx on public.ordenes (sucursal_id, status);
create index insumos_sucursal_idx on public.insumos (sucursal_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active
  );
$$;

create or replace function public.same_sucursal(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.active
        and (p.sucursal_id is null or p.sucursal_id = target)
    );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger ordenes_set_updated_at
before update on public.ordenes
for each row execute function public.set_updated_at();

-- Atomic sale: create order + decrement inventory by active recipes
create or replace function public.create_order_with_inventory(
  p_sucursal_id uuid,
  p_channel public.order_channel,
  p_payment public.payment_method,
  p_items jsonb
)
returns public.ordenes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.ordenes;
  v_item jsonb;
  v_product public.productos;
  v_receta public.recetas;
  v_ing record;
  v_total numeric(12, 2) := 0;
  v_numero text;
  v_needed numeric;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if not public.same_sucursal(p_sucursal_id) then
    raise exception 'Sin acceso a sucursal';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.productos where id = (v_item->>'producto_id')::uuid;
    if v_product.id is null then
      raise exception 'Producto inválido';
    end if;
    v_total := v_total + v_product.price * (v_item->>'qty')::numeric;

    select * into v_receta
    from public.recetas
    where producto_id = v_product.id and active
    order by version desc
    limit 1;

    if v_receta.id is not null then
      for v_ing in
        select ri.*, i.stock, i.name
        from public.receta_ingredientes ri
        join public.insumos i on i.id = ri.insumo_id
        where ri.receta_id = v_receta.id
          and i.sucursal_id = p_sucursal_id
        for update of i
      loop
        v_needed := v_ing.cantidad * (v_item->>'qty')::numeric;
        if v_ing.stock < v_needed then
          raise exception 'Stock insuficiente: %', v_ing.name;
        end if;
      end loop;
    end if;
  end loop;

  v_numero := 'SW-' || to_char(now(), 'YYMMDDHH24MISS') || '-' || floor(random()*900+100)::int;

  insert into public.ordenes (
    numero, sucursal_id, channel, status, payment_method, total, created_by, station_priority
  ) values (
    v_numero,
    p_sucursal_id,
    p_channel,
    'recibido',
    p_payment,
    v_total,
    auth.uid(),
    0
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.productos where id = (v_item->>'producto_id')::uuid;
    select * into v_receta
    from public.recetas
    where producto_id = v_product.id and active
    order by version desc
    limit 1;

    insert into public.orden_items (
      orden_id, producto_id, producto_name, qty, unit_price, notes, modifiers, receta_id
    ) values (
      v_order.id,
      v_product.id,
      v_product.name,
      (v_item->>'qty')::numeric,
      v_product.price,
      nullif(v_item->>'notes', ''),
      coalesce(v_item->'modifiers', '[]'::jsonb),
      v_receta.id
    );

    if v_receta.id is not null then
      for v_ing in
        select ri.*, i.id as iid
        from public.receta_ingredientes ri
        join public.insumos i on i.id = ri.insumo_id
        where ri.receta_id = v_receta.id
          and i.sucursal_id = p_sucursal_id
      loop
        v_needed := v_ing.cantidad * (v_item->>'qty')::numeric;
        update public.insumos
          set stock = stock - v_needed
          where id = v_ing.iid;
        insert into public.inventario_movimientos (
          insumo_id, tipo, cantidad, motivo, referencia_id, created_by
        ) values (
          v_ing.iid, 'venta', v_needed, 'Venta ' || v_order.numero, v_order.id, auth.uid()
        );
      end loop;
    end if;
  end loop;

  insert into public.audit_logs (user_id, action, entity, entity_id, after)
  values (auth.uid(), 'create_order', 'ordenes', v_order.id::text, to_jsonb(v_order));

  return v_order;
end;
$$;

alter table public.sucursales enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.productos enable row level security;
alter table public.insumos enable row level security;
alter table public.recetas enable row level security;
alter table public.receta_ingredientes enable row level security;
alter table public.ordenes enable row level security;
alter table public.orden_items enable row level security;
alter table public.inventario_movimientos enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles self or admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "profiles admin write"
on public.profiles for all
using (public.is_admin())
with check (public.is_admin());

create policy "sucursales read"
on public.sucursales for select
to authenticated
using (true);

create policy "sucursales admin write"
on public.sucursales for all
using (public.is_admin())
with check (public.is_admin());

create policy "catalog read"
on public.categories for select to authenticated using (true);

create policy "productos read"
on public.productos for select to authenticated using (true);

create policy "productos write managers"
on public.productos for all
using (
  public.is_admin()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'supervisor')
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'supervisor')
  )
);

create policy "insumos by sucursal"
on public.insumos for select
using (public.same_sucursal(sucursal_id));

create policy "insumos write inventory roles"
on public.insumos for all
using (
  public.same_sucursal(sucursal_id)
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'supervisor', 'inventario')
  )
)
with check (
  public.same_sucursal(sucursal_id)
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'supervisor', 'inventario')
  )
);

create policy "recetas read"
on public.recetas for select to authenticated using (true);

create policy "receta ingredientes read"
on public.receta_ingredientes for select to authenticated using (true);

create policy "ordenes by sucursal"
on public.ordenes for select
using (public.same_sucursal(sucursal_id));

create policy "ordenes insert staff"
on public.ordenes for insert
with check (
  public.same_sucursal(sucursal_id)
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'supervisor', 'caja')
  )
);

create policy "ordenes update kitchen"
on public.ordenes for update
using (
  public.same_sucursal(sucursal_id)
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'supervisor', 'caja', 'cocina')
  )
);

create policy "orden items by order access"
on public.orden_items for select
using (
  exists (
    select 1 from public.ordenes o
    where o.id = orden_id and public.same_sucursal(o.sucursal_id)
  )
);

create policy "movimientos by sucursal"
on public.inventario_movimientos for select
using (
  exists (
    select 1 from public.insumos i
    where i.id = insumo_id and public.same_sucursal(i.sucursal_id)
  )
);

create policy "cash by sucursal"
on public.cash_sessions for select
using (public.same_sucursal(sucursal_id));

create policy "audit admin supervisor"
on public.audit_logs for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'supervisor')
  )
);

grant usage on schema public to authenticated;
grant select, insert, update on all tables in schema public to authenticated;
grant execute on function public.create_order_with_inventory to authenticated;
-- Seed completo demo (sucursales, catálogo, insumos, recetas)
-- Ejecutar después de la migración MVP.

insert into public.sucursales (id, name, address, timezone)
values
  ('11111111-1111-1111-1111-111111111101', 'Sacha Wasi Centro', 'Jr. Amazonas 120, Iquitos', 'America/Lima'),
  ('11111111-1111-1111-1111-111111111102', 'Sacha Wasi Norte', 'Av. La Marina 880, Iquitos', 'America/Lima')
on conflict (id) do nothing;

insert into public.categories (id, name, sort_order) values
  ('22222222-2222-2222-2222-222222222201', 'Platos', 1),
  ('22222222-2222-2222-2222-222222222202', 'Combos', 2),
  ('22222222-2222-2222-2222-222222222203', 'Bebidas', 3),
  ('22222222-2222-2222-2222-222222222204', 'Extras', 4)
on conflict (id) do nothing;

insert into public.productos (id, name, sku, price, category_id, prep_minutes) values
  ('33333333-3333-3333-3333-333333333301', 'Juane Clásico', 'PL-JUANE', 18.50, '22222222-2222-2222-2222-222222222201', 12),
  ('33333333-3333-3333-3333-333333333302', 'Tacacho con Cecina', 'PL-TACA', 22.00, '22222222-2222-2222-2222-222222222201', 10),
  ('33333333-3333-3333-3333-333333333303', 'Patarashca de Doncella', 'PL-PATA', 28.00, '22222222-2222-2222-2222-222222222201', 15),
  ('33333333-3333-3333-3333-333333333304', 'Combo Selva', 'CB-SELVA', 32.00, '22222222-2222-2222-2222-222222222202', 14),
  ('33333333-3333-3333-3333-333333333305', 'Jugo de Aguaje', 'BE-AGUA', 8.00, '22222222-2222-2222-2222-222222222203', 3),
  ('33333333-3333-3333-3333-333333333306', 'Yuca Frita', 'EX-YUCA', 6.00, '22222222-2222-2222-2222-222222222204', 8)
on conflict (sku) do nothing;

insert into public.insumos (id, name, sku, unit, cost_unit, stock, min_stock, sucursal_id, lot, expiry_date) values
  ('44444444-4444-4444-4444-444444444401', 'Arroz', 'IN-ARROZ', 'kg', 4.20, 48, 10, '11111111-1111-1111-1111-111111111101', 'L-AR-2401', '2026-12-01'),
  ('44444444-4444-4444-4444-444444444402', 'Pollo', 'IN-POLLO', 'kg', 12.50, 22, 8, '11111111-1111-1111-1111-111111111101', 'L-PO-2408', '2026-08-05'),
  ('44444444-4444-4444-4444-444444444403', 'Plátano', 'IN-PLAT', 'kg', 3.50, 35, 12, '11111111-1111-1111-1111-111111111101', 'L-PL-2410', '2026-08-02'),
  ('44444444-4444-4444-4444-444444444404', 'Cecina', 'IN-CECI', 'kg', 28.00, 9, 5, '11111111-1111-1111-1111-111111111101', 'L-CE-2407', '2026-09-15'),
  ('44444444-4444-4444-4444-444444444405', 'Doncella', 'IN-DONC', 'kg', 32.00, 6.5, 4, '11111111-1111-1111-1111-111111111101', 'L-DO-2411', '2026-07-31'),
  ('44444444-4444-4444-4444-444444444406', 'Hoja de Bijao', 'IN-BIJA', 'und', 0.40, 180, 40, '11111111-1111-1111-1111-111111111101', null, null),
  ('44444444-4444-4444-4444-444444444407', 'Pulpa de Aguaje', 'IN-AGUA', 'L', 9.00, 14, 5, '11111111-1111-1111-1111-111111111101', 'L-AG-2409', '2026-08-20'),
  ('44444444-4444-4444-4444-444444444408', 'Yuca', 'IN-YUCA', 'kg', 2.80, 3.2, 8, '11111111-1111-1111-1111-111111111101', 'L-YU-2412', '2026-08-01'),
  ('44444444-4444-4444-4444-444444444409', 'Aceite', 'IN-ACEI', 'L', 8.50, 18, 6, '11111111-1111-1111-1111-111111111101', 'L-AC-2403', '2027-01-01')
on conflict (sku, sucursal_id) do nothing;

insert into public.recetas (id, producto_id, name, version, yield_portions, active, notes) values
  ('55555555-5555-5555-5555-555555555501', '33333333-3333-3333-3333-333333333301', 'Juane Clásico v1', 1, 1, true, 'Arroz, pollo y bijao'),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302', 'Tacacho con Cecina v1', 1, 1, true, null),
  ('55555555-5555-5555-5555-555555555503', '33333333-3333-3333-3333-333333333303', 'Patarashca v1', 1, 1, true, null),
  ('55555555-5555-5555-5555-555555555504', '33333333-3333-3333-3333-333333333304', 'Combo Selva v1', 1, 1, true, 'Juane + jugo + yuca'),
  ('55555555-5555-5555-5555-555555555505', '33333333-3333-3333-3333-333333333305', 'Jugo Aguaje v1', 1, 1, true, null),
  ('55555555-5555-5555-5555-555555555506', '33333333-3333-3333-3333-333333333306', 'Yuca Frita v1', 1, 1, true, null)
on conflict (producto_id, version) do nothing;

insert into public.receta_ingredientes (receta_id, insumo_id, cantidad, unidad) values
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444401', 0.25, 'kg'),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444402', 0.18, 'kg'),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444406', 1, 'und'),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444403', 0.35, 'kg'),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444404', 0.12, 'kg'),
  ('55555555-5555-5555-5555-555555555503', '44444444-4444-4444-4444-444444444405', 0.28, 'kg'),
  ('55555555-5555-5555-5555-555555555503', '44444444-4444-4444-4444-444444444406', 2, 'und'),
  ('55555555-5555-5555-5555-555555555504', '44444444-4444-4444-4444-444444444401', 0.25, 'kg'),
  ('55555555-5555-5555-5555-555555555504', '44444444-4444-4444-4444-444444444402', 0.18, 'kg'),
  ('55555555-5555-5555-5555-555555555504', '44444444-4444-4444-4444-444444444407', 0.25, 'L'),
  ('55555555-5555-5555-5555-555555555504', '44444444-4444-4444-4444-444444444408', 0.20, 'kg'),
  ('55555555-5555-5555-5555-555555555505', '44444444-4444-4444-4444-444444444407', 0.30, 'L'),
  ('55555555-5555-5555-5555-555555555506', '44444444-4444-4444-4444-444444444408', 0.25, 'kg'),
  ('55555555-5555-5555-5555-555555555506', '44444444-4444-4444-4444-444444444409', 0.05, 'L');
