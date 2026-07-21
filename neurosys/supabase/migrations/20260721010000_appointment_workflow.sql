-- NeuroSys: flujo operativo y marcas de tiempo de las citas.

alter table public.appointments
  add column checked_in_at timestamptz,
  add column started_at timestamptz,
  add column completed_at timestamptz;

-- Conserva compatibilidad con citas existentes y aporta una referencia histórica
-- razonable para estados que fueron alcanzados antes de esta migración.
update public.appointments
set
  checked_in_at = case
    when status in ('checked_in', 'in_progress', 'completed') then updated_at
    else null
  end,
  started_at = case
    when status in ('in_progress', 'completed') then updated_at
    else null
  end,
  completed_at = case
    when status = 'completed' then updated_at
    else null
  end;

create or replace function public.enforce_appointment_workflow()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      raise exception 'Las citas nuevas deben iniciar pendientes';
    end if;
    new.checked_in_at = null;
    new.started_at = null;
    new.completed_at = null;
    new.cancellation_reason = null;
    return new;
  end if;

  if new.checked_in_at is distinct from old.checked_in_at
    or new.started_at is distinct from old.started_at
    or new.completed_at is distinct from old.completed_at
  then
    raise exception 'Las marcas operativas de la cita son administradas por el sistema';
  end if;

  if (new.starts_at is distinct from old.starts_at
      or new.ends_at is distinct from old.ends_at)
    and old.status not in ('pending', 'confirmed')
  then
    raise exception 'Solo se pueden reprogramar citas pendientes o confirmadas';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'pending' and new.status in ('confirmed', 'cancelled', 'no_show'))
      or (old.status = 'confirmed' and new.status in ('checked_in', 'cancelled', 'no_show'))
      or (old.status = 'checked_in' and new.status in ('in_progress', 'cancelled'))
      or (old.status = 'in_progress' and new.status in ('completed', 'cancelled'))
    ) then
      raise exception 'Transición de cita no permitida';
    end if;

    if new.starts_at is distinct from old.starts_at
      or new.ends_at is distinct from old.ends_at
    then
      raise exception 'No se puede cambiar estado y horario simultáneamente';
    end if;

    if new.status = 'checked_in' then
      new.checked_in_at = now();
    elsif new.status = 'in_progress' then
      new.checked_in_at = old.checked_in_at;
      new.started_at = now();
    elsif new.status = 'completed' then
      new.checked_in_at = old.checked_in_at;
      new.started_at = old.started_at;
      new.completed_at = now();
    end if;
  end if;

  if new.status = 'cancelled' then
    if nullif(trim(new.cancellation_reason), '') is null then
      raise exception 'El motivo de cancelación es obligatorio';
    end if;
  elsif new.cancellation_reason is not null then
    raise exception 'Solo las citas canceladas pueden tener motivo de cancelación';
  end if;

  if old.status = 'cancelled'
    and new.cancellation_reason is distinct from old.cancellation_reason
  then
    raise exception 'El motivo de una cita cancelada es inmutable';
  end if;

  return new;
end;
$$;

create trigger appointments_enforce_workflow
before insert or update on public.appointments
for each row execute function public.enforce_appointment_workflow();

revoke all on function public.enforce_appointment_workflow() from public;

comment on column public.appointments.checked_in_at is
  'Momento del check-in, administrado por el flujo de estados.';
comment on column public.appointments.started_at is
  'Momento de inicio de atención, administrado por el flujo de estados.';
comment on column public.appointments.completed_at is
  'Momento de finalización, administrado por el flujo de estados.';
