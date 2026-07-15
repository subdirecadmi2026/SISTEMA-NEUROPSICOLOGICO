-- NeuroSys: núcleo clínico multiempresa
-- Ejecutar mediante Supabase CLI o desde el editor SQL del proyecto.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

create type public.app_role as enum (
  'super_admin',
  'director',
  'clinical_director',
  'reception',
  'professional',
  'cashier',
  'accounting',
  'inventory',
  'patient'
);

create type public.patient_status as enum (
  'active',
  'follow_up',
  'evaluation',
  'discharged',
  'inactive'
);

create type public.appointment_status as enum (
  'pending',
  'confirmed',
  'checked_in',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text not null,
  tax_id text,
  timezone text not null default 'America/Guayaquil',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_legal_name_length check (char_length(legal_name) between 2 and 160)
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null,
  code text not null,
  address text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  document_number text,
  phone text,
  professional_license text,
  avatar_path text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  branch_id uuid references public.branches(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, branch_id, user_id, role)
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  branch_id uuid not null references public.branches(id),
  clinical_record_number text not null,
  first_names text not null,
  last_names text not null,
  document_type text not null default 'cedula',
  document_number text,
  birth_date date not null,
  sex_at_birth text,
  gender_identity text,
  phone text,
  email text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  legal_guardian_name text,
  legal_guardian_document text,
  legal_guardian_phone text,
  insurance_provider text,
  status public.patient_status not null default 'evaluation',
  referral_reason text,
  primary_diagnosis text,
  allergies text,
  medications text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, clinical_record_number),
  constraint patients_names_length check (
    char_length(first_names) between 1 and 120
    and char_length(last_names) between 1 and 120
  ),
  constraint patients_birth_date_valid check (birth_date <= current_date)
);

create unique index patients_document_per_organization
  on public.patients (organization_id, document_number)
  where document_number is not null and deleted_at is null;

create index patients_organization_branch_idx
  on public.patients (organization_id, branch_id)
  where deleted_at is null;

create index patients_name_search_idx
  on public.patients (
    organization_id,
    lower(last_names),
    lower(first_names)
  )
  where deleted_at is null;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  branch_id uuid not null references public.branches(id),
  patient_id uuid not null references public.patients(id),
  professional_id uuid not null references public.profiles(id),
  service_name text not null,
  room_name text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  notes text,
  cancellation_reason text,
  reminder_consent boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint appointments_time_order check (ends_at > starts_at),
  constraint appointments_max_duration check (
    ends_at <= starts_at + interval '8 hours'
  )
);

create index appointments_calendar_idx
  on public.appointments (organization_id, branch_id, starts_at, ends_at)
  where deleted_at is null;

create index appointments_patient_idx
  on public.appointments (patient_id, starts_at desc)
  where deleted_at is null;

create index appointments_professional_idx
  on public.appointments (professional_id, starts_at, ends_at)
  where deleted_at is null and status not in ('cancelled', 'no_show');

alter table public.appointments
  add constraint appointments_professional_no_overlap
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (deleted_at is null and status not in ('cancelled', 'no_show'));

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id),
  actor_id uuid references public.profiles(id),
  table_name text not null,
  record_id uuid not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  occurred_at timestamptz not null default now(),
  request_id text,
  changed_fields text[] not null default '{}'
);

create index audit_logs_record_idx
  on public.audit_logs (organization_id, table_name, record_id, occurred_at desc);

-- Funciones de autorización. SECURITY DEFINER evita recursión de políticas RLS.
create or replace function public.has_organization_access(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and active = true
  );
$$;

create or replace function public.has_organization_role(
  target_organization_id uuid,
  accepted_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role = any(accepted_roles)
      and active = true
  );
$$;

create or replace function public.shares_organization_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs
      on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid()
      and theirs.user_id = target_user_id
      and mine.active = true
      and theirs.active = true
  );
$$;

revoke all on function public.has_organization_access(uuid) from public;
revoke all on function public.has_organization_role(uuid, public.app_role[]) from public;
revoke all on function public.shares_organization_with(uuid) from public;
grant execute on function public.has_organization_access(uuid) to authenticated;
grant execute on function public.has_organization_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.shares_organization_with(uuid) to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1),
      'Usuario NeuroSys'
    )
  );
  return new;
end;
$$;

create trigger auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.bootstrap_organization(
  organization_name text,
  branch_name text default 'Sede principal'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_organization_id uuid;
  new_branch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if exists (
    select 1 from public.memberships where user_id = auth.uid()
  ) then
    raise exception 'User already belongs to an organization';
  end if;

  insert into public.organizations (legal_name, trade_name)
  values (trim(organization_name), trim(organization_name))
  returning id into new_organization_id;

  insert into public.branches (organization_id, name, code)
  values (new_organization_id, trim(branch_name), 'PRINCIPAL')
  returning id into new_branch_id;

  insert into public.memberships (
    organization_id,
    branch_id,
    user_id,
    role
  ) values (
    new_organization_id,
    new_branch_id,
    auth.uid(),
    'super_admin'
  );

  return new_organization_id;
end;
$$;

revoke all on function public.bootstrap_organization(text, text) from public;
grant execute on function public.bootstrap_organization(text, text) to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger branches_set_updated_at
before update on public.branches
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger patients_set_updated_at
before update on public.patients
for each row execute function public.set_updated_at();

create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

-- Auditoría intencionalmente sin copias de datos clínicos o PII.
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_row jsonb;
  previous_row jsonb;
  fields text[];
begin
  target_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  previous_row := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(key order by key), '{}')
      into fields
      from jsonb_object_keys(target_row) key
      where target_row -> key is distinct from previous_row -> key;
  elsif tg_op = 'INSERT' then
    fields := array['record_created'];
  else
    fields := array['record_deleted'];
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_id,
    table_name,
    record_id,
    operation,
    request_id,
    changed_fields
  ) values (
    (target_row ->> 'organization_id')::uuid,
    auth.uid(),
    tg_table_name,
    (target_row ->> 'id')::uuid,
    tg_op,
    coalesce(
      nullif(current_setting('request.headers', true), ''),
      '{}'
    )::jsonb ->> 'x-request-id',
    fields
  );

  return coalesce(new, old);
end;
$$;

create trigger patients_audit
after insert or update or delete on public.patients
for each row execute function public.write_audit_log();

create trigger appointments_audit
after insert or update or delete on public.appointments
for each row execute function public.write_audit_log();

-- Row Level Security
alter table public.organizations enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.audit_logs enable row level security;

create policy "members can view their organizations"
on public.organizations for select to authenticated
using (public.has_organization_access(id));

create policy "directors can update their organizations"
on public.organizations for update to authenticated
using (
  public.has_organization_role(
    id,
    array['super_admin', 'director']::public.app_role[]
  )
)
with check (
  public.has_organization_role(
    id,
    array['super_admin', 'director']::public.app_role[]
  )
);

create policy "members can view branches"
on public.branches for select to authenticated
using (public.has_organization_access(organization_id));

create policy "directors can manage branches"
on public.branches for all to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['super_admin', 'director']::public.app_role[]
  )
)
with check (
  public.has_organization_role(
    organization_id,
    array['super_admin', 'director']::public.app_role[]
  )
);

create policy "users can view own profile"
on public.profiles for select to authenticated
using (id = auth.uid() or public.shares_organization_with(id));

create policy "users can update own profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "users can view own memberships"
on public.memberships for select to authenticated
using (user_id = auth.uid());

create policy "directors can manage memberships"
on public.memberships for all to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['super_admin', 'director']::public.app_role[]
  )
)
with check (
  public.has_organization_role(
    organization_id,
    array['super_admin', 'director']::public.app_role[]
  )
);

create policy "clinical staff can view patients"
on public.patients for select to authenticated
using (
  deleted_at is null
  and public.has_organization_role(
    organization_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'reception',
      'professional',
      'cashier'
    ]::public.app_role[]
  )
);

create policy "authorized staff can create patients"
on public.patients for insert to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(
    organization_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'reception',
      'professional'
    ]::public.app_role[]
  )
);

create policy "authorized staff can update patients"
on public.patients for update to authenticated
using (
  deleted_at is null
  and public.has_organization_role(
    organization_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'reception',
      'professional'
    ]::public.app_role[]
  )
)
with check (
  public.has_organization_role(
    organization_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'reception',
      'professional'
    ]::public.app_role[]
  )
);

create policy "staff can view appointments"
on public.appointments for select to authenticated
using (
  deleted_at is null
  and public.has_organization_access(organization_id)
);

create policy "staff can create appointments"
on public.appointments for insert to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(
    organization_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'reception',
      'professional'
    ]::public.app_role[]
  )
);

create policy "staff can update appointments"
on public.appointments for update to authenticated
using (
  deleted_at is null
  and public.has_organization_role(
    organization_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'reception',
      'professional'
    ]::public.app_role[]
  )
)
with check (
  public.has_organization_role(
    organization_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'reception',
      'professional'
    ]::public.app_role[]
  )
);

create policy "directors can read audit logs"
on public.audit_logs for select to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['super_admin', 'director', 'clinical_director']::public.app_role[]
  )
);

-- No se conceden políticas DELETE para pacientes ni citas. Se utiliza
-- deleted_at para conservar la trazabilidad clínica.
