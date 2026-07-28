-- Sacha Wasi PART 3: incidencias + realtime KDS + políticas auxiliares
-- Ejecutar en SQL Editor después de SETUP.sql y SETUP_PART2.sql

create table if not exists public.incidencias (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references public.sucursales (id),
  title text not null,
  description text not null default '',
  severity text not null default 'media'
    check (severity in ('baja', 'media', 'alta', 'critica')),
  status text not null default 'abierta'
    check (status in ('abierta', 'en_curso', 'resuelta', 'cerrada')),
  reported_by uuid references public.profiles (id),
  assigned_to uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists incidencias_sucursal_status_idx
  on public.incidencias (sucursal_id, status);

drop trigger if exists incidencias_set_updated_at on public.incidencias;
create trigger incidencias_set_updated_at
before update on public.incidencias
for each row execute function public.set_updated_at();

alter table public.incidencias enable row level security;

drop policy if exists "incidencias read staff" on public.incidencias;
create policy "incidencias read staff"
on public.incidencias for select
to authenticated
using (public.same_sucursal(sucursal_id));

drop policy if exists "incidencias write staff" on public.incidencias;
create policy "incidencias write staff"
on public.incidencias for all
to authenticated
using (
  public.same_sucursal(sucursal_id)
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'supervisor', 'caja', 'cocina', 'inventario')
  )
)
with check (public.same_sucursal(sucursal_id));

-- Realtime para KDS (idempotente)
do $$
begin
  begin
    alter publication supabase_realtime add table public.ordenes;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.incidencias;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

-- Seed ejemplo (solo si hay sucursales)
insert into public.incidencias (sucursal_id, title, description, severity, status)
select
  '11111111-1111-1111-1111-111111111101',
  'Freidora lenta en apertura',
  'La freidora 2 tarda en alcanzar temperatura. Revisar resistencia.',
  'media',
  'abierta'
where exists (
  select 1 from public.sucursales where id = '11111111-1111-1111-1111-111111111101'
)
and not exists (
  select 1 from public.incidencias
  where title = 'Freidora lenta en apertura'
    and sucursal_id = '11111111-1111-1111-1111-111111111101'
);

select
  (select count(*) from public.incidencias) as incidencias,
  (select count(*) from public.ordenes) as ordenes;
