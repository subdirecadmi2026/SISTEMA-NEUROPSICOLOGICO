-- Amplía estados de permisos: pendiente (espera TH) | activo | cancelado
-- Ejecutar en SQL Editor del proyecto Supabase de Horarios HGP.

alter table public.staff_leaves
  drop constraint if exists staff_leaves_status_check;

alter table public.staff_leaves
  add constraint staff_leaves_status_check
  check (status in ('pendiente', 'activo', 'cancelado'));

alter table public.staff_leaves
  add column if not exists validated_by text;

alter table public.staff_leaves
  add column if not exists validated_by_name text;

alter table public.staff_leaves
  add column if not exists validated_at timestamptz;
