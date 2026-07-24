-- Biblioteca de personal (Admin ↔ Validador / Permisos) sync multi-navegador
-- Ejecutar en SQL Editor del proyecto Supabase de Horarios HGP.

create table if not exists public.staff_library (
  id text primary key,
  service_type public.hgp_service_type not null,
  unit_name text not null,
  fun text not null,
  name text not null,
  role text,
  relacion_laboral text,
  codigo_personal text,
  section text,
  active boolean not null default true,
  sort_order int not null default 1,
  horas_medicas numeric not null default 0,
  horas_violencia_domestica numeric not null default 0,
  horas_lactancia numeric not null default 0,
  horas_extras numeric not null default 0,
  observaciones text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists staff_library_unit_idx
  on public.staff_library (service_type, unit_name);
create index if not exists staff_library_name_idx
  on public.staff_library (name);

-- Refuerza la tabla staff de horarios con tipo de servicio (si aún no existe).
alter table public.staff
  add column if not exists service_type public.hgp_service_type;

alter table public.staff_library enable row level security;

drop policy if exists "hgp_staff_library_all" on public.staff_library;
create policy "hgp_staff_library_all" on public.staff_library
  for all
  using (true)
  with check (true);

grant select, insert, update, delete on public.staff_library to anon, authenticated, service_role;
