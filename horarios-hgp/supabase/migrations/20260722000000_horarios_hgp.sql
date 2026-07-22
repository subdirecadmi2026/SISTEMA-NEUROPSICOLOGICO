-- Horarios HGP — esquema independiente (no compartido con NeuroSys)
-- Ejecutar en un proyecto Supabase dedicado o schema separado.

create extension if not exists "pgcrypto";

create type public.hgp_service_type as enum ('enfermeria', 'medico');
create type public.hgp_user_role as enum (
  'lider_servicio',
  'gestion_enfermeria',
  'subdireccion',
  'direccion_asistencial',
  'talento_humano',
  'admin'
);
create type public.hgp_schedule_status as enum (
  'BORRADOR',
  'EN_REVISION',
  'APROBADO',
  'ARCHIVADO'
);

create table if not exists public.hgp_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  role public.hgp_user_role not null default 'lider_servicio',
  service_units text[] not null default '{}',
  auth_user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_type public.hgp_service_type not null,
  leader_name text,
  unique (name, service_type)
);

create table if not exists public.staff (
  id text primary key,
  service_id uuid references public.services (id) on delete cascade,
  fun text not null,
  name text not null,
  role text,
  relacion_laboral text,
  codigo_personal text,
  section text,
  service_unit text,
  active boolean not null default true,
  sort_order int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id text primary key,
  hospital text not null,
  provincial text not null,
  service_type public.hgp_service_type not null,
  department text,
  unit_name text not null,
  jefe_servicio text,
  month int not null check (month between 1 and 12),
  year int not null,
  notes text,
  contingency_plan text,
  llamado boolean not null default false,
  vacaciones_flag boolean not null default false,
  elaborado_por text,
  revisado_por text,
  aprobado_por text,
  talento_humano text,
  status public.hgp_schedule_status not null default 'BORRADOR',
  version int not null default 1,
  coverage_rule jsonb not null default '{"minStaffPerDay":2,"minHoursPerDay":16}',
  payload jsonb not null,
  created_by text,
  updated_at timestamptz not null default now(),
  unique (service_type, unit_name, year, month)
);

create table if not exists public.schedule_cells (
  id bigserial primary key,
  schedule_id text not null references public.schedules (id) on delete cascade,
  staff_id text not null,
  day int not null check (day between 1 and 31),
  code text not null,
  unique (schedule_id, staff_id, day)
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  schedule_id text not null references public.schedules (id) on delete cascade,
  role text not null,
  name text not null,
  cargo text not null,
  signed_at timestamptz not null default now(),
  user_id text
);

create table if not exists public.contingency (
  id text primary key,
  schedule_id text not null references public.schedules (id) on delete cascade,
  name text,
  coverage text,
  phone text
);

create table if not exists public.audit_log (
  id text primary key,
  schedule_id text references public.schedules (id) on delete cascade,
  at timestamptz not null default now(),
  user_id text,
  user_name text not null,
  action text not null,
  detail text
);

create index if not exists schedules_period_idx
  on public.schedules (service_type, unit_name, year, month);
create index if not exists schedule_cells_schedule_idx
  on public.schedule_cells (schedule_id);
create index if not exists audit_log_schedule_idx
  on public.audit_log (schedule_id);

alter table public.hgp_users enable row level security;
alter table public.services enable row level security;
alter table public.staff enable row level security;
alter table public.schedules enable row level security;
alter table public.schedule_cells enable row level security;
alter table public.approvals enable row level security;
alter table public.contingency enable row level security;
alter table public.audit_log enable row level security;

-- Políticas permisivas para arranque (ajustar en producción).
create policy "hgp_schedules_read" on public.schedules
  for select using (true);
create policy "hgp_schedules_write" on public.schedules
  for all using (true) with check (true);
create policy "hgp_cells_all" on public.schedule_cells
  for all using (true) with check (true);
create policy "hgp_audit_all" on public.audit_log
  for all using (true) with check (true);
create policy "hgp_staff_all" on public.staff
  for all using (true) with check (true);
create policy "hgp_services_all" on public.services
  for all using (true) with check (true);
create policy "hgp_approvals_all" on public.approvals
  for all using (true) with check (true);
create policy "hgp_contingency_all" on public.contingency
  for all using (true) with check (true);
create policy "hgp_users_read" on public.hgp_users
  for select using (true);
