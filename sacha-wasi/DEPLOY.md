# Despliegue Sacha Wasi (Vercel + Supabase)

## 1. Supabase

1. Crea un proyecto en [Supabase](https://supabase.com).
2. En SQL Editor, ejecuta:
   - `supabase/migrations/20260728160000_sacha_wasi_mvp.sql`
   - `supabase/seed.sql` (datos demo de catálogo/sucursales)
3. En Authentication → Users, crea usuarios y luego inserta filas en `profiles`
   con el mismo `id` de `auth.users`, asignando `role` y `sucursal_id`.
4. Copia `Project URL` y la clave `anon` / publishable.

## 2. Vercel

1. Importa el repo y configura **Root Directory** = `sacha-wasi`.
2. Variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Deploy. Verifica `/api/health` → `"mode": "supabase"`.

## 3. Auth URLs

En Supabase Auth → URL Configuration:

- Site URL: `https://tu-app.vercel.app`
- Redirect URLs: producción + previews de Vercel

## 4. Seguridad

- Nunca subas `SUPABASE_SERVICE_ROLE_KEY` al frontend.
- Mantén RLS activo (incluido en la migración).
- Usa Edge Functions / RPC `create_order_with_inventory` para ventas atómicas.

## 5. Modo demo

Sin variables de Supabase, la app funciona 100% en el navegador con
localStorage (ideal para capacitar personal sin tocar datos reales).
