-- NeuroSys: evaluaciones, terapias, informes, comunicaciones y facturación.

create table public.evaluation_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  branch_id uuid not null,
  patient_id uuid not null,
  evaluator_id uuid not null references public.profiles(id),
  evaluation_type text not null,
  status text not null default 'in_progress',
  clinical_summary text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint evaluation_cases_status_valid check (
    status in ('in_progress', 'completed', 'authorized', 'cancelled')
  ),
  constraint evaluation_cases_type_length check (
    char_length(evaluation_type) between 2 and 160
  ),
  constraint evaluation_cases_patient_tenant_fk
    foreign key (organization_id, branch_id, patient_id)
    references public.patients (organization_id, branch_id, id)
);

create table public.therapy_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  branch_id uuid not null,
  patient_id uuid not null,
  lead_professional_id uuid not null references public.profiles(id),
  title text not null,
  objectives text not null,
  progress smallint not null default 0,
  status text not null default 'active',
  started_on date not null default current_date,
  ended_on date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint therapy_plans_status_valid check (
    status in ('active', 'paused', 'completed', 'cancelled')
  ),
  constraint therapy_plans_progress_valid check (progress between 0 and 100),
  constraint therapy_plans_title_length check (char_length(title) between 2 and 160),
  constraint therapy_plans_patient_tenant_fk
    foreign key (organization_id, branch_id, patient_id)
    references public.patients (organization_id, branch_id, id)
);

create table public.clinical_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  branch_id uuid not null,
  patient_id uuid not null,
  report_type text not null,
  title text not null,
  content text not null,
  status text not null default 'draft',
  author_id uuid not null references public.profiles(id),
  signed_at timestamptz,
  delivered_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint clinical_reports_status_valid check (
    status in ('draft', 'signed', 'delivered', 'voided')
  ),
  constraint clinical_reports_title_length check (char_length(title) between 2 and 180),
  constraint clinical_reports_content_length check (char_length(content) between 10 and 30000),
  constraint clinical_reports_patient_tenant_fk
    foreign key (organization_id, branch_id, patient_id)
    references public.patients (organization_id, branch_id, id)
);

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  branch_id uuid not null,
  patient_id uuid not null,
  channel text not null,
  recipient text not null,
  subject text,
  body text not null,
  status text not null default 'scheduled',
  consent_verified boolean not null default false,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint communications_channel_valid check (
    channel in ('email', 'sms', 'whatsapp', 'phone_call', 'in_person')
  ),
  constraint communications_status_valid check (
    status in ('scheduled', 'sent', 'failed', 'cancelled')
  ),
  constraint communications_consent_required check (consent_verified = true),
  constraint communications_body_length check (char_length(body) between 2 and 4000),
  constraint communications_patient_tenant_fk
    foreign key (organization_id, branch_id, patient_id)
    references public.patients (organization_id, branch_id, id)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  branch_id uuid not null,
  patient_id uuid not null,
  invoice_number text not null,
  description text not null,
  status text not null default 'issued',
  subtotal numeric(12,2) not null,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null,
  issued_at timestamptz not null default now(),
  due_on date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, invoice_number),
  constraint invoices_status_valid check (
    status in ('issued', 'partially_paid', 'paid', 'voided')
  ),
  constraint invoices_amounts_valid check (
    subtotal >= 0 and tax_amount >= 0 and total_amount = subtotal + tax_amount
  ),
  constraint invoices_patient_tenant_fk
    foreign key (organization_id, branch_id, patient_id)
    references public.patients (organization_id, branch_id, id)
);

alter table public.invoices
  add constraint invoices_tenant_id_unique
  unique (organization_id, branch_id, id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  branch_id uuid not null,
  invoice_id uuid not null,
  operation_key uuid not null,
  amount numeric(12,2) not null,
  method text not null,
  reference text,
  received_by uuid not null references public.profiles(id),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint payments_amount_valid check (amount > 0),
  constraint payments_method_valid check (
    method in ('cash', 'card', 'transfer', 'other')
  ),
  unique (organization_id, operation_key),
  constraint payments_invoice_tenant_fk
    foreign key (organization_id, branch_id, invoice_id)
    references public.invoices (organization_id, branch_id, id)
);

create index evaluation_cases_workspace_idx
  on public.evaluation_cases (organization_id, branch_id, status, created_at desc)
  where deleted_at is null;
create index therapy_plans_workspace_idx
  on public.therapy_plans (organization_id, branch_id, status, created_at desc)
  where deleted_at is null;
create index clinical_reports_workspace_idx
  on public.clinical_reports (organization_id, branch_id, status, created_at desc)
  where deleted_at is null;
create index communications_workspace_idx
  on public.communications (organization_id, branch_id, status, scheduled_at desc)
  where deleted_at is null;
create index invoices_workspace_idx
  on public.invoices (organization_id, branch_id, status, issued_at desc)
  where deleted_at is null;
create index payments_invoice_idx on public.payments (invoice_id, paid_at desc);

create trigger evaluation_cases_set_updated_at
before update on public.evaluation_cases
for each row execute function public.set_updated_at();
create trigger therapy_plans_set_updated_at
before update on public.therapy_plans
for each row execute function public.set_updated_at();
create trigger clinical_reports_set_updated_at
before update on public.clinical_reports
for each row execute function public.set_updated_at();
create trigger communications_set_updated_at
before update on public.communications
for each row execute function public.set_updated_at();
create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create or replace function public.normalize_new_operational_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.created_at = now();
  new.updated_at = now();
  new.deleted_at = null;
  if tg_table_name = 'evaluation_cases' then
    new.status = 'in_progress';
    new.started_at = now();
    new.completed_at = null;
  elsif tg_table_name = 'therapy_plans' then
    new.status = 'active';
    new.progress = 0;
    new.ended_on = null;
  elsif tg_table_name = 'clinical_reports' then
    new.status = 'draft';
    new.signed_at = null;
    new.delivered_at = null;
  elsif tg_table_name = 'communications' then
    new.status = 'scheduled';
    new.sent_at = null;
  elsif tg_table_name = 'invoices' then
    new.status = 'issued';
    new.issued_at = now();
  end if;
  return new;
end;
$$;

create trigger evaluation_cases_normalize_insert
before insert on public.evaluation_cases
for each row execute function public.normalize_new_operational_record();
create trigger therapy_plans_normalize_insert
before insert on public.therapy_plans
for each row execute function public.normalize_new_operational_record();
create trigger clinical_reports_normalize_insert
before insert on public.clinical_reports
for each row execute function public.normalize_new_operational_record();
create trigger communications_normalize_insert
before insert on public.communications
for each row execute function public.normalize_new_operational_record();
create trigger invoices_normalize_insert
before insert on public.invoices
for each row execute function public.normalize_new_operational_record();

create or replace function public.protect_operational_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.branch_id is distinct from old.branch_id
    or new.patient_id is distinct from old.patient_id
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
    or new.deleted_at is distinct from old.deleted_at
  then
    raise exception 'La identidad del registro no se puede modificar';
  end if;
  if tg_table_name = 'evaluation_cases' and (
    new.evaluator_id is distinct from old.evaluator_id
    or new.started_at is distinct from old.started_at
    or (
      old.status in ('completed', 'authorized')
      and (
        new.evaluation_type is distinct from old.evaluation_type
        or new.clinical_summary is distinct from old.clinical_summary
      )
    )
    or (
      new.status is not distinct from old.status
      and new.completed_at is distinct from old.completed_at
    )
  ) then
    raise exception 'La autoría y fechas de la evaluación son inmutables';
  elsif tg_table_name = 'therapy_plans' and (
    new.lead_professional_id is distinct from old.lead_professional_id
    or new.started_on is distinct from old.started_on
    or (
      old.status = 'completed'
      and (
        new.title is distinct from old.title
        or new.objectives is distinct from old.objectives
        or new.progress is distinct from old.progress
      )
    )
    or (
      new.status is not distinct from old.status
      and new.ended_on is distinct from old.ended_on
    )
  ) then
    raise exception 'La autoría y cierre del plan son inmutables';
  elsif tg_table_name = 'clinical_reports' and (
    new.author_id is distinct from old.author_id
    or (
      new.status is not distinct from old.status
      and (
        new.signed_at is distinct from old.signed_at
        or new.delivered_at is distinct from old.delivered_at
      )
    )
  ) then
    raise exception 'La autoría y fechas del informe son inmutables';
  elsif tg_table_name = 'communications'
    and (
      (
        new.status is not distinct from old.status
        and new.sent_at is distinct from old.sent_at
      )
      or (
        old.status = 'sent'
        and (
          new.channel is distinct from old.channel
          or new.recipient is distinct from old.recipient
          or new.subject is distinct from old.subject
          or new.body is distinct from old.body
          or new.consent_verified is distinct from old.consent_verified
        )
      )
    )
  then
    raise exception 'La fecha de envío es inmutable';
  end if;
  return new;
end;
$$;

create trigger evaluation_cases_protect_identity
before update on public.evaluation_cases
for each row execute function public.protect_operational_record();
create trigger therapy_plans_protect_identity
before update on public.therapy_plans
for each row execute function public.protect_operational_record();
create trigger clinical_reports_protect_identity
before update on public.clinical_reports
for each row execute function public.protect_operational_record();
create trigger communications_protect_identity
before update on public.communications
for each row execute function public.protect_operational_record();
create trigger invoices_protect_identity
before update on public.invoices
for each row execute function public.protect_operational_record();

create or replace function public.protect_signed_report()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status
    and not (
      (old.status = 'draft' and new.status in ('signed', 'voided'))
      or (old.status = 'signed' and new.status = 'delivered')
    )
  then
    raise exception 'Transición de informe no permitida';
  end if;
  if old.status in ('signed', 'delivered') and (
    new.title is distinct from old.title
    or new.content is distinct from old.content
    or new.report_type is distinct from old.report_type
  ) then
    raise exception 'El contenido de un informe firmado es inmutable';
  end if;
  if old.status = 'draft' and new.status = 'signed' then
    new.signed_at = now();
    new.delivered_at = null;
  elsif old.status = 'draft' and new.status = 'voided' then
    new.signed_at = null;
    new.delivered_at = null;
  end if;
  if new.status = 'delivered' and old.status <> 'delivered' then
    new.signed_at = old.signed_at;
    new.delivered_at = now();
  end if;
  return new;
end;
$$;

create trigger clinical_reports_protect_signed
before update on public.clinical_reports
for each row execute function public.protect_signed_report();

create or replace function public.normalize_operational_status_time()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if tg_table_name = 'evaluation_cases'
      and not (
        (old.status = 'in_progress' and new.status in ('completed', 'cancelled'))
        or (old.status = 'completed' and new.status = 'authorized')
      )
    then
      raise exception 'Transición de evaluación no permitida';
    elsif tg_table_name = 'therapy_plans'
      and not (
        (old.status = 'active' and new.status in ('paused', 'completed', 'cancelled'))
        or (old.status = 'paused' and new.status in ('active', 'completed', 'cancelled'))
      )
    then
      raise exception 'Transición de plan terapéutico no permitida';
    elsif tg_table_name = 'communications'
      and not (
        old.status = 'scheduled'
        and new.status in ('sent', 'failed', 'cancelled')
      )
    then
      raise exception 'Transición de comunicación no permitida';
    end if;
  end if;

  if tg_table_name = 'evaluation_cases'
    and new.status in ('completed', 'authorized')
    and old.status = 'in_progress'
  then
    new.completed_at = now();
  elsif tg_table_name = 'evaluation_cases'
    and new.status = 'authorized'
    and old.status = 'completed'
  then
    new.completed_at = old.completed_at;
  elsif tg_table_name = 'evaluation_cases'
    and new.status = 'cancelled'
  then
    new.completed_at = null;
  elsif tg_table_name = 'communications'
    and new.status = 'sent'
    and old.status <> 'sent'
  then
    new.sent_at = now();
  elsif tg_table_name = 'communications'
    and new.status in ('failed', 'cancelled')
  then
    new.sent_at = null;
  elsif tg_table_name = 'therapy_plans'
    and new.status = 'completed'
    and old.status <> 'completed'
  then
    new.ended_on = current_date;
    new.progress = 100;
  elsif tg_table_name = 'therapy_plans'
    and new.status = 'cancelled'
    and old.status <> 'cancelled'
  then
    new.ended_on = current_date;
  elsif tg_table_name = 'therapy_plans'
    and new.status in ('active', 'paused')
  then
    new.ended_on = null;
  end if;
  return new;
end;
$$;

create trigger evaluation_cases_normalize_status
before update on public.evaluation_cases
for each row execute function public.normalize_operational_status_time();
create trigger therapy_plans_normalize_status
before update on public.therapy_plans
for each row execute function public.normalize_operational_status_time();
create trigger communications_normalize_status
before update on public.communications
for each row execute function public.normalize_operational_status_time();

create or replace function public.apply_payment_to_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_total numeric(12,2);
  paid_total numeric(12,2);
begin
  select total_amount into invoice_total
  from public.invoices
  where id = new.invoice_id
    and organization_id = new.organization_id
    and branch_id = new.branch_id
    and status <> 'voided'
  for update;

  if invoice_total is null then
    raise exception 'La factura no existe o está anulada';
  end if;

  select coalesce(sum(amount), 0) into paid_total
  from public.payments
  where invoice_id = new.invoice_id;

  if paid_total + new.amount > invoice_total then
    raise exception 'El pago supera el saldo de la factura';
  end if;
  return new;
end;
$$;

create trigger payments_validate_total
before insert on public.payments
for each row execute function public.apply_payment_to_invoice();

create or replace function public.refresh_invoice_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  paid_total numeric(12,2);
begin
  select coalesce(sum(amount), 0) into paid_total
  from public.payments
  where invoice_id = new.invoice_id;

  update public.invoices
  set status = case
    when paid_total >= total_amount then 'paid'
    when paid_total > 0 then 'partially_paid'
    else 'issued'
  end
  where id = new.invoice_id and status <> 'voided';
  return new;
end;
$$;

create trigger payments_refresh_invoice
after insert on public.payments
for each row execute function public.refresh_invoice_payment_status();

create trigger evaluation_cases_audit
after insert or update or delete on public.evaluation_cases
for each row execute function public.write_audit_log();
create trigger therapy_plans_audit
after insert or update or delete on public.therapy_plans
for each row execute function public.write_audit_log();
create trigger clinical_reports_audit
after insert or update or delete on public.clinical_reports
for each row execute function public.write_audit_log();
create trigger communications_audit
after insert or update or delete on public.communications
for each row execute function public.write_audit_log();
create trigger invoices_audit
after insert or update or delete on public.invoices
for each row execute function public.write_audit_log();
create trigger payments_audit
after insert or update or delete on public.payments
for each row execute function public.write_audit_log();

alter table public.evaluation_cases enable row level security;
alter table public.therapy_plans enable row level security;
alter table public.clinical_reports enable row level security;
alter table public.communications enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;

create policy "clinical team views evaluations"
on public.evaluation_cases for select to authenticated
using (
  deleted_at is null and public.has_branch_role(
    organization_id, branch_id,
    array['super_admin','director','clinical_director','professional']::public.app_role[]
  )
);
create policy "clinical team creates evaluations"
on public.evaluation_cases for insert to authenticated
with check (
  deleted_at is null
  and created_by = auth.uid() and evaluator_id = auth.uid()
  and public.has_branch_role(
    organization_id, branch_id,
    array['super_admin','director','clinical_director','professional']::public.app_role[]
  )
);
create policy "authors and directors update evaluations"
on public.evaluation_cases for update to authenticated
using (
  deleted_at is null
  and (
    created_by = auth.uid()
    or public.has_branch_role(
      organization_id, branch_id,
      array['super_admin','director','clinical_director']::public.app_role[]
    )
  )
)
with check (
  deleted_at is null and public.has_branch_role(
    organization_id, branch_id,
    array['super_admin','director','clinical_director','professional']::public.app_role[]
  )
);

create policy "clinical team views therapy plans"
on public.therapy_plans for select to authenticated
using (
  deleted_at is null and public.has_branch_role(
    organization_id, branch_id,
    array['super_admin','director','clinical_director','professional']::public.app_role[]
  )
);
create policy "clinical team creates therapy plans"
on public.therapy_plans for insert to authenticated
with check (
  deleted_at is null
  and created_by = auth.uid() and lead_professional_id = auth.uid()
  and public.has_branch_role(
    organization_id, branch_id,
    array['super_admin','director','clinical_director','professional']::public.app_role[]
  )
);
create policy "authors and directors update therapy plans"
on public.therapy_plans for update to authenticated
using (
  deleted_at is null
  and (
    created_by = auth.uid()
    or public.has_branch_role(
      organization_id, branch_id,
      array['super_admin','director','clinical_director']::public.app_role[]
    )
  )
)
with check (
  deleted_at is null and public.has_branch_role(
    organization_id, branch_id,
    array['super_admin','director','clinical_director','professional']::public.app_role[]
  )
);

create policy "clinical team views reports"
on public.clinical_reports for select to authenticated
using (
  deleted_at is null and public.has_branch_role(
    organization_id, branch_id,
    array['super_admin','director','clinical_director','professional']::public.app_role[]
  )
);
create policy "clinical team creates reports"
on public.clinical_reports for insert to authenticated
with check (
  deleted_at is null
  and created_by = auth.uid() and author_id = auth.uid()
  and public.has_branch_role(
    organization_id, branch_id,
    array['super_admin','director','clinical_director','professional']::public.app_role[]
  )
);
create policy "authors and directors update reports"
on public.clinical_reports for update to authenticated
using (
  deleted_at is null
  and (
    created_by = auth.uid()
    or public.has_branch_role(
      organization_id, branch_id,
      array['super_admin','director','clinical_director']::public.app_role[]
    )
  )
)
with check (
  deleted_at is null and public.has_branch_role(
    organization_id, branch_id,
    array['super_admin','director','clinical_director','professional']::public.app_role[]
  )
);

create policy "authorized staff view communications"
on public.communications for select to authenticated
using (
  deleted_at is null and public.has_branch_role(
    organization_id, branch_id,
    array['super_admin','director','clinical_director','professional','reception']::public.app_role[]
  )
);
create policy "authorized staff create communications"
on public.communications for insert to authenticated
with check (
  deleted_at is null and created_by = auth.uid() and consent_verified = true
  and public.has_branch_role(
    organization_id, branch_id,
    array['super_admin','director','clinical_director','professional','reception']::public.app_role[]
  )
);
create policy "authors and directors update communications"
on public.communications for update to authenticated
using (
  deleted_at is null
  and (
    created_by = auth.uid()
    or public.has_branch_role(
      organization_id, branch_id,
      array['super_admin','director','clinical_director']::public.app_role[]
    )
  )
)
with check (
  deleted_at is null and consent_verified = true
  and public.has_branch_role(
    organization_id, branch_id,
    array['super_admin','director','clinical_director','professional','reception']::public.app_role[]
  )
);

create policy "billing staff view invoices"
on public.invoices for select to authenticated
using (
  deleted_at is null and public.has_branch_role(
    organization_id, branch_id,
    array['super_admin','director','reception','cashier','accounting']::public.app_role[]
  )
);
create policy "billing staff create invoices"
on public.invoices for insert to authenticated
with check (
  deleted_at is null and created_by = auth.uid()
  and public.has_branch_role(
    organization_id, branch_id,
    array['super_admin','director','reception','cashier']::public.app_role[]
  )
);

create policy "billing staff view payments"
on public.payments for select to authenticated
using (
  public.has_branch_role(
    organization_id, branch_id,
    array['super_admin','director','reception','cashier','accounting']::public.app_role[]
  )
);

create policy "cashiers register payments"
on public.payments for insert to authenticated
with check (
  received_by = auth.uid()
  and public.has_branch_role(
    organization_id, branch_id,
    array['super_admin','director','cashier']::public.app_role[]
  )
);

grant select, insert, update on public.evaluation_cases to authenticated;
grant select, insert, update on public.therapy_plans to authenticated;
grant select, insert, update on public.clinical_reports to authenticated;
grant select, insert, update on public.communications to authenticated;
grant select, insert on public.invoices to authenticated;
grant select, insert on public.payments to authenticated;

revoke all on function public.protect_operational_record() from public;
revoke all on function public.normalize_new_operational_record() from public;
revoke all on function public.protect_signed_report() from public;
revoke all on function public.normalize_operational_status_time() from public;
revoke all on function public.apply_payment_to_invoice() from public;
revoke all on function public.refresh_invoice_payment_status() from public;
