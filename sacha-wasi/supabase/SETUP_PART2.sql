-- Sacha Wasi PART 2: políticas de escritura + seed re-check + helper admin
-- Ejecutar en SQL Editor después de SETUP.sql

-- Lectura de catálogo también para anon (útil para health/debug)
drop policy if exists "categories anon read" on public.categories;
create policy "categories anon read"
on public.categories for select to anon using (true);

drop policy if exists "productos anon read" on public.productos;
create policy "productos anon read"
on public.productos for select to anon using (true);

drop policy if exists "sucursales anon read" on public.sucursales;
create policy "sucursales anon read"
on public.sucursales for select to anon using (true);

drop policy if exists "recetas anon read" on public.recetas;
create policy "recetas anon read"
on public.recetas for select to anon using (true);

drop policy if exists "receta ingredientes anon read" on public.receta_ingredientes;
create policy "receta ingredientes anon read"
on public.receta_ingredientes for select to anon using (true);

-- Escrituras faltantes
drop policy if exists "orden items insert staff" on public.orden_items;
create policy "orden items insert staff"
on public.orden_items for insert
with check (
  exists (
    select 1 from public.ordenes o
    where o.id = orden_id and public.same_sucursal(o.sucursal_id)
  )
);

drop policy if exists "movimientos write inventory" on public.inventario_movimientos;
create policy "movimientos write inventory"
on public.inventario_movimientos for all
using (
  exists (
    select 1 from public.insumos i
    where i.id = insumo_id
      and public.same_sucursal(i.sucursal_id)
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin', 'supervisor', 'inventario', 'caja')
      )
  )
)
with check (
  exists (
    select 1 from public.insumos i
    where i.id = insumo_id and public.same_sucursal(i.sucursal_id)
  )
);

drop policy if exists "cash write staff" on public.cash_sessions;
create policy "cash write staff"
on public.cash_sessions for all
using (
  public.same_sucursal(sucursal_id)
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'supervisor', 'caja')
  )
)
with check (
  public.same_sucursal(sucursal_id)
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'supervisor', 'caja')
  )
);

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "audit insert authenticated" on public.audit_logs;
create policy "audit insert authenticated"
on public.audit_logs for insert
with check (auth.uid() is not null);

-- Re-seed si quedaron vacías (idempotente)
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

insert into public.receta_ingredientes (receta_id, insumo_id, cantidad, unidad)
select v.receta_id, v.insumo_id, v.cantidad, v.unidad
from (values
  ('55555555-5555-5555-5555-555555555501'::uuid, '44444444-4444-4444-4444-444444444401'::uuid, 0.25, 'kg'),
  ('55555555-5555-5555-5555-555555555501'::uuid, '44444444-4444-4444-4444-444444444402'::uuid, 0.18, 'kg'),
  ('55555555-5555-5555-5555-555555555501'::uuid, '44444444-4444-4444-4444-444444444406'::uuid, 1, 'und'),
  ('55555555-5555-5555-5555-555555555502'::uuid, '44444444-4444-4444-4444-444444444403'::uuid, 0.35, 'kg'),
  ('55555555-5555-5555-5555-555555555502'::uuid, '44444444-4444-4444-4444-444444444404'::uuid, 0.12, 'kg'),
  ('55555555-5555-5555-5555-555555555503'::uuid, '44444444-4444-4444-4444-444444444405'::uuid, 0.28, 'kg'),
  ('55555555-5555-5555-5555-555555555503'::uuid, '44444444-4444-4444-4444-444444444406'::uuid, 2, 'und'),
  ('55555555-5555-5555-5555-555555555504'::uuid, '44444444-4444-4444-4444-444444444401'::uuid, 0.25, 'kg'),
  ('55555555-5555-5555-5555-555555555504'::uuid, '44444444-4444-4444-4444-444444444402'::uuid, 0.18, 'kg'),
  ('55555555-5555-5555-5555-555555555504'::uuid, '44444444-4444-4444-4444-444444444407'::uuid, 0.25, 'L'),
  ('55555555-5555-5555-5555-555555555504'::uuid, '44444444-4444-4444-4444-444444444408'::uuid, 0.20, 'kg'),
  ('55555555-5555-5555-5555-555555555505'::uuid, '44444444-4444-4444-4444-444444444407'::uuid, 0.30, 'L'),
  ('55555555-5555-5555-5555-555555555506'::uuid, '44444444-4444-4444-4444-444444444408'::uuid, 0.25, 'kg'),
  ('55555555-5555-5555-5555-555555555506'::uuid, '44444444-4444-4444-4444-444444444409'::uuid, 0.05, 'L')
) as v(receta_id, insumo_id, cantidad, unidad)
where not exists (
  select 1 from public.receta_ingredientes ri
  where ri.receta_id = v.receta_id and ri.insumo_id = v.insumo_id
);

-- Helper: después de crear un usuario en Authentication → Users,
-- ejecuta esto reemplazando USER_UUID y el email:
--
-- insert into public.profiles (id, email, full_name, role, sucursal_id, active)
-- values (
--   'USER_UUID',
--   'tu@email.com',
--   'Admin Sacha Wasi',
--   'admin',
--   null,
--   true
-- )
-- on conflict (id) do update set role = excluded.role, active = true;

select
  (select count(*) from public.sucursales) as sucursales,
  (select count(*) from public.productos) as productos,
  (select count(*) from public.insumos) as insumos,
  (select count(*) from public.recetas) as recetas;
