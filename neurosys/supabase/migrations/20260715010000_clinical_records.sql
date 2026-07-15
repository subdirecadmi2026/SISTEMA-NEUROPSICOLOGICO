-- NeuroSys: evoluciones clínicas estructuradas y firmadas.

create table public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  branch_id uuid not null references public.branches(id),
  patient_id uuid not null references public.patients(id),
  appointment_id uuid references public.appointments(id),
  author_id uuid not null references public.profiles(id),
  note_type text not null default 'evolution',
  title text not null,
  subjective text,
  objective text,
  assessment text not null,
  plan text,
  status text not null default 'signed',
  occurred_at timestamptz not null default now(),
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint clinical_notes_type_valid check (
    note_type in ('initial', 'evolution', 'evaluation', 'discharge', 'other')
  ),
  constraint clinical_notes_status_valid check (status in ('draft', 'signed')),
  constraint clinical_notes_title_length check (char_length(title) between 2 and 160),
  constraint clinical_notes_assessment_length check (
    char_length(assessment) between 2 and 8000
  ),
  constraint clinical_notes_signed_state check (
    (status = 'draft' and signed_at is null)
    or (status = 'signed' and signed_at is not null)
  )
);

create index clinical_notes_patient_timeline_idx
  on public.clinical_notes (patient_id, occurred_at desc)
  where deleted_at is null;

create index clinical_notes_organization_idx
  on public.clinical_notes (organization_id, branch_id, occurred_at desc)
  where deleted_at is null;

create trigger clinical_notes_set_updated_at
before update on public.clinical_notes
for each row execute function public.set_updated_at();

create trigger clinical_notes_audit
after insert or update or delete on public.clinical_notes
for each row execute function public.write_audit_log();

alter table public.clinical_notes enable row level security;

create policy "clinical staff can view clinical notes"
on public.clinical_notes for select to authenticated
using (
  deleted_at is null
  and public.has_organization_role(
    organization_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'professional'
    ]::public.app_role[]
  )
);

create policy "clinical staff can create clinical notes"
on public.clinical_notes for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.patients
    where id = patient_id
      and organization_id = clinical_notes.organization_id
      and branch_id = clinical_notes.branch_id
  )
  and public.has_organization_role(
    organization_id,
    array[
      'super_admin',
      'director',
      'clinical_director',
      'professional'
    ]::public.app_role[]
  )
);

create policy "authors can update drafts"
on public.clinical_notes for update to authenticated
using (
  deleted_at is null
  and status = 'draft'
  and (
    author_id = auth.uid()
    or public.has_organization_role(
      organization_id,
      array['super_admin', 'director', 'clinical_director']::public.app_role[]
    )
  )
)
with check (
  author_id = auth.uid()
  or public.has_organization_role(
    organization_id,
    array['super_admin', 'director', 'clinical_director']::public.app_role[]
  )
);

grant select, insert, update on public.clinical_notes to authenticated;

-- Una evolución firmada es inmutable. Las correcciones se registran como una
-- nueva evolución para preservar la trazabilidad del expediente.
create or replace function public.protect_signed_clinical_note()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'signed' then
    raise exception 'Las evoluciones firmadas no se pueden modificar';
  end if;
  return new;
end;
$$;

create trigger clinical_notes_protect_signed
before update on public.clinical_notes
for each row execute function public.protect_signed_clinical_note();

revoke all on function public.protect_signed_clinical_note() from public;
