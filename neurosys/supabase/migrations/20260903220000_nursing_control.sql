create extension if not exists pgcrypto;

create type public.app_role as enum ('Administrador', 'Supervisor', 'Jefe de enfermería');
create type public.staff_status as enum ('Activo', 'Vacaciones', 'Inactivo');
create type public.schedule_status as enum ('Borrador', 'En revisión', 'Aprobado');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  leader_name text not null default '',
  coverage text not null default '24 horas',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  full_name text not null,
  email text not null,
  role public.app_role not null default 'Jefe de enfermería',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  full_name text not null,
  document text not null,
  position text not null,
  status public.staff_status not null default 'Activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, document)
);

create table public.shift_codes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  start_time time,
  end_time time,
  hours numeric(5,2) not null default 0 check (hours >= 0 and hours <= 24),
  color text not null default '#edf0f3',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  name text not null,
  month smallint not null check (month between 1 and 12),
  year smallint not null check (year between 2020 and 2100),
  status public.schedule_status not null default 'Borrador',
  coverage_percentage numeric(5,2) not null default 0 check (coverage_percentage between 0 and 100),
  created_by uuid not null references public.profiles(id) on delete restrict,
  reviewed_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_id, month, year)
);

create table public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  shift_code_id uuid references public.shift_codes(id) on delete set null,
  work_date date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, staff_id, work_date)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index staff_service_idx on public.staff(service_id);
create index schedules_service_period_idx on public.schedules(service_id, year, month);
create index schedule_entries_schedule_date_idx on public.schedule_entries(schedule_id, work_date);
create index audit_logs_organization_created_idx on public.audit_logs(organization_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger services_updated_at before update on public.services
for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger staff_updated_at before update on public.staff
for each row execute function public.set_updated_at();
create trigger shift_codes_updated_at before update on public.shift_codes
for each row execute function public.set_updated_at();
create trigger schedules_updated_at before update on public.schedules
for each row execute function public.set_updated_at();
create trigger schedule_entries_updated_at before update on public.schedule_entries
for each row execute function public.set_updated_at();

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_organization uuid;
  assigned_role public.app_role;
begin
  select id into target_organization from public.organizations order by created_at limit 1;

  if target_organization is null then
    insert into public.organizations (name, city)
    values ('Hospital General', 'Riobamba')
    returning id into target_organization;

    insert into public.services (organization_id, name, code, coverage)
    values
      (target_organization, 'Unidad de Cuidados Intensivos', 'UCI', '24 horas'),
      (target_organization, 'Emergencia', 'EME', '24 horas'),
      (target_organization, 'Hospitalización', 'HOS', '24 horas'),
      (target_organization, 'Consulta externa', 'CEX', '07:00 — 17:00');

    insert into public.shift_codes (
      organization_id, code, name, start_time, end_time, hours, color
    )
    values
      (target_organization, 'D', 'Turno diurno', '07:00', '19:30', 12, '#dceeff'),
      (target_organization, 'N1', 'Turno nocturno', '19:00', '07:30', 12, '#e9e2ff'),
      (target_organization, 'A1', 'Turno administrativo', '08:00', '16:00', 8, '#daf4e8'),
      (target_organization, 'L', 'Libre', null, null, 0, '#f1f4f6'),
      (target_organization, 'V', 'Vacaciones', null, null, 0, '#ffe5ef'),
      (target_organization, 'EB', 'Enfermedad', null, null, 0, '#fff0cf');

    assigned_role := 'Administrador';
  else
    assigned_role := 'Jefe de enfermería';
  end if;

  insert into public.profiles (id, organization_id, full_name, email, role)
  values (
    new.id,
    target_organization,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    assigned_role
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.staff enable row level security;
alter table public.shift_codes enable row level security;
alter table public.schedules enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.audit_logs enable row level security;

create policy "organization members can view organization"
on public.organizations for select
to authenticated
using (id = public.current_organization_id());

create policy "members can view profiles"
on public.profiles for select
to authenticated
using (organization_id = public.current_organization_id());

create policy "users can update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and organization_id = public.current_organization_id());

create policy "administrators can manage profiles"
on public.profiles for all
to authenticated
using (organization_id = public.current_organization_id() and public.current_app_role() = 'Administrador')
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'Administrador');

create policy "members can view services"
on public.services for select
to authenticated
using (organization_id = public.current_organization_id());

create policy "administrators can manage services"
on public.services for all
to authenticated
using (organization_id = public.current_organization_id() and public.current_app_role() = 'Administrador')
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'Administrador');

create policy "members can view staff"
on public.staff for select
to authenticated
using (organization_id = public.current_organization_id());

create policy "administrators manage all staff"
on public.staff for all
to authenticated
using (organization_id = public.current_organization_id() and public.current_app_role() = 'Administrador')
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'Administrador');

create policy "leaders manage staff in their service"
on public.staff for all
to authenticated
using (
  organization_id = public.current_organization_id()
  and public.current_app_role() = 'Jefe de enfermería'
  and service_id = (select service_id from public.profiles where id = auth.uid())
)
with check (
  organization_id = public.current_organization_id()
  and public.current_app_role() = 'Jefe de enfermería'
  and service_id = (select service_id from public.profiles where id = auth.uid())
);

create policy "members can view shift codes"
on public.shift_codes for select
to authenticated
using (organization_id = public.current_organization_id());

create policy "administrators can manage shift codes"
on public.shift_codes for all
to authenticated
using (organization_id = public.current_organization_id() and public.current_app_role() = 'Administrador')
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'Administrador');

create policy "members can view schedules"
on public.schedules for select
to authenticated
using (organization_id = public.current_organization_id());

create policy "administrators manage all schedules"
on public.schedules for all
to authenticated
using (organization_id = public.current_organization_id() and public.current_app_role() = 'Administrador')
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'Administrador');

create policy "supervisors review schedules"
on public.schedules for update
to authenticated
using (organization_id = public.current_organization_id() and public.current_app_role() = 'Supervisor')
with check (organization_id = public.current_organization_id() and public.current_app_role() = 'Supervisor');

create policy "leaders manage schedules in their service"
on public.schedules for all
to authenticated
using (
  organization_id = public.current_organization_id()
  and public.current_app_role() = 'Jefe de enfermería'
  and service_id = (select service_id from public.profiles where id = auth.uid())
)
with check (
  organization_id = public.current_organization_id()
  and public.current_app_role() = 'Jefe de enfermería'
  and service_id = (select service_id from public.profiles where id = auth.uid())
);

create policy "members can view schedule entries"
on public.schedule_entries for select
to authenticated
using (
  exists (
    select 1 from public.schedules schedule
    where schedule.id = schedule_id
      and schedule.organization_id = public.current_organization_id()
  )
);

create policy "schedule managers can create entries"
on public.schedule_entries for insert
to authenticated
with check (
  exists (
    select 1 from public.schedules schedule
    where schedule.id = schedule_id
      and schedule.organization_id = public.current_organization_id()
      and (
        public.current_app_role() = 'Administrador'
        or (
          public.current_app_role() = 'Jefe de enfermería'
          and schedule.service_id = (select service_id from public.profiles where id = auth.uid())
        )
      )
  )
);

create policy "schedule managers can update entries"
on public.schedule_entries for update
to authenticated
using (
  exists (
    select 1 from public.schedules schedule
    where schedule.id = schedule_id
      and schedule.organization_id = public.current_organization_id()
      and (
        public.current_app_role() = 'Administrador'
        or (
          public.current_app_role() = 'Jefe de enfermería'
          and schedule.service_id = (select service_id from public.profiles where id = auth.uid())
        )
      )
  )
);

create policy "schedule managers can delete entries"
on public.schedule_entries for delete
to authenticated
using (
  exists (
    select 1 from public.schedules schedule
    where schedule.id = schedule_id
      and schedule.organization_id = public.current_organization_id()
      and (
        public.current_app_role() = 'Administrador'
        or (
          public.current_app_role() = 'Jefe de enfermería'
          and schedule.service_id = (select service_id from public.profiles where id = auth.uid())
        )
      )
  )
);

create policy "members can view audit logs"
on public.audit_logs for select
to authenticated
using (organization_id = public.current_organization_id());

create policy "members can create audit logs"
on public.audit_logs for insert
to authenticated
with check (organization_id = public.current_organization_id() and actor_id = auth.uid());

grant execute on function public.current_profile() to authenticated;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
