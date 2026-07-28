-- Conexión completa Horarios HGP ↔ Supabase
-- Ejecutar en SQL Editor del proyecto (después de las migraciones anteriores).

-- Roles usados por la app (login)
do $$
begin
  alter type public.hgp_user_role add value if not exists 'revisor';
  alter type public.hgp_user_role add value if not exists 'validador';
  alter type public.hgp_user_role add value if not exists 'admisiones';
exception
  when duplicate_object then null;
end $$;

-- Usuarios de la app (id texto como u-jefe, no uuid)
create table if not exists public.hgp_app_users (
  id text primary key,
  email text unique not null,
  name text not null,
  role text not null,
  service_units text[] not null default '{}',
  password text,
  active boolean not null default true,
  source text not null default 'custom',
  deleted_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Firmas / autoridades hospitalarias
create table if not exists public.hospital_signers (
  id text primary key,
  nombres text not null default '',
  apellidos text not null default '',
  cargo text not null default '',
  kind text not null,
  email text not null default '',
  linked_user_id text,
  sort_order int not null default 1,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.hospital_signers_meta (
  id text primary key default 'default',
  total_count int not null default 3,
  updated_at timestamptz not null default now()
);

-- Claves / turnos
create table if not exists public.shift_codes (
  id text primary key,
  service_type public.hgp_service_type not null,
  code text not null,
  label text not null,
  hours numeric not null default 0,
  time_range text,
  note text,
  color text,
  text_color text,
  code_group text not null default 'turno',
  updated_at timestamptz not null default now(),
  unique (service_type, code)
);

-- Feriados custom y nacionales ocultos
create table if not exists public.holiday_overrides (
  date text primary key,
  name text not null,
  kind text not null default 'custom', -- custom | suppressed
  updated_at timestamptz not null default now()
);

-- Permisos / vacaciones (si aún no existen)
create table if not exists public.staff_leaves (
  id text primary key,
  staff_id text not null,
  staff_name text not null,
  service_type public.hgp_service_type not null,
  unit_name text not null,
  kind text not null,
  absence_code text not null,
  start_date date not null,
  end_date date not null,
  authorized_hours numeric not null default 0,
  hours_per_day numeric not null default 8,
  notes text not null default '',
  status text not null default 'activo',
  created_by text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  validated_by text,
  validated_by_name text,
  validated_at timestamptz,
  check (end_date >= start_date),
  check (status in ('pendiente', 'activo', 'cancelado'))
);

create table if not exists public.hgp_notifications (
  id text primary key,
  created_at timestamptz not null default now(),
  read boolean not null default false,
  to_role text not null default 'lider_servicio',
  unit_name text,
  schedule_id text not null,
  title text not null,
  body text not null,
  kind text
);

-- Índices
create index if not exists staff_leaves_unit_idx
  on public.staff_leaves (service_type, unit_name);
create index if not exists staff_leaves_staff_idx
  on public.staff_leaves (staff_id);
create index if not exists hgp_notifications_created_idx
  on public.hgp_notifications (created_at desc);
create index if not exists shift_codes_service_idx
  on public.shift_codes (service_type);
create index if not exists hgp_app_users_email_idx
  on public.hgp_app_users (email);

-- RLS permisivo (arranque; ajustar en producción)
alter table public.hgp_app_users enable row level security;
alter table public.hospital_signers enable row level security;
alter table public.hospital_signers_meta enable row level security;
alter table public.shift_codes enable row level security;
alter table public.holiday_overrides enable row level security;
alter table public.staff_leaves enable row level security;
alter table public.hgp_notifications enable row level security;

drop policy if exists "hgp_app_users_all" on public.hgp_app_users;
create policy "hgp_app_users_all" on public.hgp_app_users
  for all using (true) with check (true);

drop policy if exists "hospital_signers_all" on public.hospital_signers;
create policy "hospital_signers_all" on public.hospital_signers
  for all using (true) with check (true);

drop policy if exists "hospital_signers_meta_all" on public.hospital_signers_meta;
create policy "hospital_signers_meta_all" on public.hospital_signers_meta
  for all using (true) with check (true);

drop policy if exists "shift_codes_all" on public.shift_codes;
create policy "shift_codes_all" on public.shift_codes
  for all using (true) with check (true);

drop policy if exists "holiday_overrides_all" on public.holiday_overrides;
create policy "holiday_overrides_all" on public.holiday_overrides
  for all using (true) with check (true);

drop policy if exists "hgp_staff_leaves_all" on public.staff_leaves;
create policy "hgp_staff_leaves_all" on public.staff_leaves
  for all using (true) with check (true);

drop policy if exists "hgp_notifications_all" on public.hgp_notifications;
create policy "hgp_notifications_all" on public.hgp_notifications
  for all using (true) with check (true);

-- Ampliar hgp_users legado (solo lectura → escritura) si existe
drop policy if exists "hgp_users_read" on public.hgp_users;
drop policy if exists "hgp_users_all" on public.hgp_users;
create policy "hgp_users_all" on public.hgp_users
  for all using (true) with check (true);

grant select, insert, update, delete on public.hgp_app_users to anon, authenticated, service_role;
grant select, insert, update, delete on public.hospital_signers to anon, authenticated, service_role;
grant select, insert, update, delete on public.hospital_signers_meta to anon, authenticated, service_role;
grant select, insert, update, delete on public.shift_codes to anon, authenticated, service_role;
grant select, insert, update, delete on public.holiday_overrides to anon, authenticated, service_role;
grant select, insert, update, delete on public.staff_leaves to anon, authenticated, service_role;
grant select, insert, update, delete on public.hgp_notifications to anon, authenticated, service_role;

-- Estado pendiente en staff_leaves si la tabla ya existía con check viejo
alter table public.staff_leaves drop constraint if exists staff_leaves_status_check;
alter table public.staff_leaves
  add constraint staff_leaves_status_check
  check (status in ('pendiente', 'activo', 'cancelado'));
alter table public.staff_leaves add column if not exists validated_by text;
alter table public.staff_leaves add column if not exists validated_by_name text;
alter table public.staff_leaves add column if not exists validated_at timestamptz;
