-- NeuroSys: aislamiento por sede e integridad referencial multiempresa.

alter table public.branches
  add constraint branches_organization_id_id_unique unique (organization_id, id);

alter table public.patients
  add constraint patients_organization_branch_id_unique
  unique (organization_id, branch_id, id);

alter table public.appointments
  add constraint appointments_organization_branch_id_unique
  unique (organization_id, branch_id, id);

alter table public.appointments
  add constraint appointments_organization_branch_patient_id_unique
  unique (organization_id, branch_id, patient_id, id);

alter table public.memberships
  add constraint memberships_branch_same_organization
  foreign key (organization_id, branch_id)
  references public.branches (organization_id, id);

alter table public.patients
  add constraint patients_branch_same_organization
  foreign key (organization_id, branch_id)
  references public.branches (organization_id, id);

alter table public.appointments
  add constraint appointments_patient_same_tenant
  foreign key (organization_id, branch_id, patient_id)
  references public.patients (organization_id, branch_id, id);

alter table public.clinical_notes
  add constraint clinical_notes_patient_same_tenant
  foreign key (organization_id, branch_id, patient_id)
  references public.patients (organization_id, branch_id, id);

alter table public.clinical_notes
  add constraint clinical_notes_appointment_same_tenant
  foreign key (organization_id, branch_id, appointment_id)
  references public.appointments (organization_id, branch_id, id);

alter table public.clinical_notes
  add constraint clinical_notes_appointment_same_patient
  foreign key (organization_id, branch_id, patient_id, appointment_id)
  references public.appointments (
    organization_id,
    branch_id,
    patient_id,
    id
  );

create or replace function public.has_branch_role(
  target_organization_id uuid,
  target_branch_id uuid,
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
      and (
        branch_id = target_branch_id
        or branch_id is null
        or role in ('super_admin', 'director', 'clinical_director')
      )
  );
$$;

revoke all on function public.has_branch_role(
  uuid,
  uuid,
  public.app_role[]
) from public;
grant execute on function public.has_branch_role(
  uuid,
  uuid,
  public.app_role[]
) to authenticated;

create or replace function public.validate_patient_staff_tenant()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.memberships
    where organization_id = new.organization_id
      and user_id = new.created_by
      and active = true
      and (
        branch_id = new.branch_id
        or branch_id is null
        or role in ('super_admin', 'director', 'clinical_director')
      )
  ) then
    raise exception 'El creador no pertenece a la sede del paciente';
  end if;
  return new;
end;
$$;

create trigger patients_validate_staff_tenant
before insert or update on public.patients
for each row execute function public.validate_patient_staff_tenant();

create or replace function public.protect_core_tenant_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.created_by is distinct from old.created_by
  then
    raise exception 'La identidad, organización y creador no se pueden modificar';
  end if;
  return new;
end;
$$;

create trigger patients_protect_tenant_identity
before update on public.patients
for each row execute function public.protect_core_tenant_identity();

create or replace function public.validate_appointment_staff_tenant()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.memberships
    where organization_id = new.organization_id
      and user_id = new.professional_id
      and active = true
      and role in (
        'super_admin',
        'director',
        'clinical_director',
        'professional'
      )
      and (
        branch_id = new.branch_id
        or branch_id is null
        or role in ('super_admin', 'director', 'clinical_director')
      )
  ) then
    raise exception 'El profesional no pertenece a la sede de la cita';
  end if;

  if not exists (
    select 1
    from public.memberships
    where organization_id = new.organization_id
      and user_id = new.created_by
      and active = true
      and (
        branch_id = new.branch_id
        or branch_id is null
        or role in ('super_admin', 'director', 'clinical_director')
      )
  ) then
    raise exception 'El creador no pertenece a la sede de la cita';
  end if;
  return new;
end;
$$;

create trigger appointments_validate_staff_tenant
before insert or update on public.appointments
for each row execute function public.validate_appointment_staff_tenant();

create trigger appointments_protect_tenant_identity
before update on public.appointments
for each row execute function public.protect_core_tenant_identity();

create or replace function public.validate_clinical_note_tenant()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.memberships
    where organization_id = new.organization_id
      and user_id = new.author_id
      and active = true
      and role in (
        'super_admin',
        'director',
        'clinical_director',
        'professional'
      )
      and (
        branch_id = new.branch_id
        or branch_id is null
        or role in ('super_admin', 'director', 'clinical_director')
      )
  ) then
    raise exception 'El autor no pertenece a la sede del expediente';
  end if;

  if new.appointment_id is not null and not exists (
    select 1
    from public.appointments
    where id = new.appointment_id
      and patient_id = new.patient_id
      and organization_id = new.organization_id
      and branch_id = new.branch_id
  ) then
    raise exception 'La cita no corresponde al paciente del expediente';
  end if;
  return new;
end;
$$;

create trigger clinical_notes_validate_tenant
before insert or update on public.clinical_notes
for each row execute function public.validate_clinical_note_tenant();

revoke all on function public.validate_patient_staff_tenant() from public;
revoke all on function public.validate_appointment_staff_tenant() from public;
revoke all on function public.validate_clinical_note_tenant() from public;
revoke all on function public.protect_core_tenant_identity() from public;

drop policy "clinical staff can view patients" on public.patients;
create policy "clinical staff can view patients"
on public.patients for select to authenticated
using (
  deleted_at is null
  and public.has_branch_role(
    organization_id,
    branch_id,
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

drop policy "authorized staff can create patients" on public.patients;
create policy "authorized staff can create patients"
on public.patients for insert to authenticated
with check (
  created_by = auth.uid()
  and public.has_branch_role(
    organization_id,
    branch_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'reception',
      'professional'
    ]::public.app_role[]
  )
);

drop policy "authorized staff can update patients" on public.patients;
create policy "authorized staff can update patients"
on public.patients for update to authenticated
using (
  deleted_at is null
  and public.has_branch_role(
    organization_id,
    branch_id,
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
  public.has_branch_role(
    organization_id,
    branch_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'reception',
      'professional'
    ]::public.app_role[]
  )
);

drop policy "staff can view appointments" on public.appointments;
create policy "staff can view appointments"
on public.appointments for select to authenticated
using (
  deleted_at is null
  and public.has_branch_role(
    organization_id,
    branch_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'reception',
      'professional',
      'cashier',
      'accounting'
    ]::public.app_role[]
  )
);

drop policy "staff can create appointments" on public.appointments;
create policy "staff can create appointments"
on public.appointments for insert to authenticated
with check (
  created_by = auth.uid()
  and public.has_branch_role(
    organization_id,
    branch_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'reception',
      'professional'
    ]::public.app_role[]
  )
);

drop policy "staff can update appointments" on public.appointments;
create policy "staff can update appointments"
on public.appointments for update to authenticated
using (
  deleted_at is null
  and public.has_branch_role(
    organization_id,
    branch_id,
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
  public.has_branch_role(
    organization_id,
    branch_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'reception',
      'professional'
    ]::public.app_role[]
  )
);

drop policy "clinical staff can view clinical notes" on public.clinical_notes;
create policy "clinical staff can view clinical notes"
on public.clinical_notes for select to authenticated
using (
  deleted_at is null
  and public.has_branch_role(
    organization_id,
    branch_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'professional'
    ]::public.app_role[]
  )
);

drop policy "clinical staff can create clinical notes" on public.clinical_notes;
create policy "clinical staff can create clinical notes"
on public.clinical_notes for insert to authenticated
with check (
  author_id = auth.uid()
  and deleted_at is null
  and public.has_branch_role(
    organization_id,
    branch_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'professional'
    ]::public.app_role[]
  )
);

drop policy "authors can update drafts" on public.clinical_notes;
create policy "authors can update drafts"
on public.clinical_notes for update to authenticated
using (
  deleted_at is null
  and status = 'draft'
  and public.has_branch_role(
    organization_id,
    branch_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'professional'
    ]::public.app_role[]
  )
  and (
    author_id = auth.uid()
    or public.has_branch_role(
      organization_id,
      branch_id,
      array['super_admin', 'director', 'clinical_director']::public.app_role[]
    )
  )
)
with check (
  deleted_at is null
  and public.has_branch_role(
    organization_id,
    branch_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'professional'
    ]::public.app_role[]
  )
);

-- Serializa el bootstrap por usuario para evitar organizaciones duplicadas.
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

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));

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
