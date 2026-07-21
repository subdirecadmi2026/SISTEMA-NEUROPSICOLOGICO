-- NeuroSys: administración segura de membresías y visibilidad de perfiles.

create or replace function public.can_manage_organization_member(
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships manager
    join public.memberships target
      on target.organization_id = manager.organization_id
    where manager.user_id = auth.uid()
      and manager.active = true
      and manager.role in ('super_admin', 'director')
      and target.user_id = target_user_id
  );
$$;

revoke all on function public.can_manage_organization_member(uuid) from public;
grant execute on function public.can_manage_organization_member(uuid)
  to authenticated;

drop policy "users can view own profile" on public.profiles;
create policy "users can view permitted profiles"
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.shares_organization_with(id)
  or public.can_manage_organization_member(id)
);

create or replace function public.protect_membership_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_super_admins integer;
  caller_is_super_admin boolean;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and new.role = 'super_admin' then
      select exists (
        select 1
        from public.memberships
        where organization_id = new.organization_id
          and user_id = auth.uid()
          and role = 'super_admin'
          and active = true
      ) into caller_is_super_admin;

      if not caller_is_super_admin and exists (
        select 1
        from public.memberships
        where organization_id = new.organization_id
      ) then
        raise exception 'Solo un superadministrador puede otorgar ese rol';
      end if;
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.branch_id is distinct from old.branch_id
    or new.user_id is distinct from old.user_id
  then
    raise exception 'La identidad y organización de la membresía no se pueden modificar';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(old.organization_id::text, 0)
  );

  if auth.uid() is not null
    and (old.role = 'super_admin' or new.role = 'super_admin')
  then
    select exists (
      select 1
      from public.memberships
      where organization_id = old.organization_id
        and user_id = auth.uid()
        and role = 'super_admin'
        and active = true
    ) into caller_is_super_admin;

    if not caller_is_super_admin then
      raise exception 'Solo un superadministrador puede gestionar ese rol';
    end if;
  end if;

  if old.active
    and not new.active
    and old.user_id = auth.uid()
  then
    raise exception 'No puedes desactivar tu propia membresía';
  end if;

  if old.active
    and old.role = 'super_admin'
    and (not new.active or new.role <> 'super_admin')
  then
    select count(*)
      into remaining_super_admins
      from public.memberships
      where organization_id = old.organization_id
        and id <> old.id
        and role = 'super_admin'
        and active = true;

    if remaining_super_admins = 0 then
      raise exception 'La organización debe conservar al menos un superadministrador';
    end if;
  end if;

  return new;
end;
$$;

create trigger memberships_protect_integrity
before insert or update on public.memberships
for each row execute function public.protect_membership_integrity();

revoke all on function public.protect_membership_integrity() from public;
