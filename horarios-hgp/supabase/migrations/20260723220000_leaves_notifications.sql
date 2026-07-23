-- Permisos / vacaciones + notificaciones (sync multi-navegador)
-- Ejecutar en SQL Editor del proyecto Supabase de Horarios HGP.

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
  check (end_date >= start_date),
  check (status in ('activo', 'cancelado'))
);

create index if not exists staff_leaves_unit_idx
  on public.staff_leaves (service_type, unit_name);
create index if not exists staff_leaves_staff_idx
  on public.staff_leaves (staff_id);
create index if not exists staff_leaves_dates_idx
  on public.staff_leaves (start_date, end_date);

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

create index if not exists hgp_notifications_created_idx
  on public.hgp_notifications (created_at desc);
create index if not exists hgp_notifications_unit_idx
  on public.hgp_notifications (unit_name);

alter table public.staff_leaves enable row level security;
alter table public.hgp_notifications enable row level security;

drop policy if exists "hgp_staff_leaves_all" on public.staff_leaves;
create policy "hgp_staff_leaves_all" on public.staff_leaves
  for all using (true) with check (true);

drop policy if exists "hgp_notifications_all" on public.hgp_notifications;
create policy "hgp_notifications_all" on public.hgp_notifications
  for all using (true) with check (true);

grant select, insert, update, delete on public.staff_leaves to anon, authenticated, service_role;
grant select, insert, update, delete on public.hgp_notifications to anon, authenticated, service_role;

-- Roles de app actuales (si el enum aún no los tiene)
do $$
begin
  alter type public.hgp_user_role add value if not exists 'revisor';
  alter type public.hgp_user_role add value if not exists 'validador';
exception
  when duplicate_object then null;
end $$;
