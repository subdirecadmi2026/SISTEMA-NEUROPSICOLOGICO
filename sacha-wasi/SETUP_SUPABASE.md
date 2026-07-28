# Conectar Sacha Wasi a Supabase

Proyecto: `https://jmpebicnieuvmjpfjyud.supabase.co`

## 1. Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://jmpebicnieuvmjpfjyud.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

En Vercel: Root Directory = `sacha-wasi` + las mismas variables.

## 2. Crear el esquema (obligatorio)

En **SQL Editor**, ejecuta en orden:

1. [`supabase/SETUP.sql`](./supabase/SETUP.sql) — tablas, RLS, RPC `create_order_with_inventory`
2. [`supabase/SETUP_PART2.sql`](./supabase/SETUP_PART2.sql) — políticas extra + seed visible (anon read)
3. [`supabase/SETUP_PART3.sql`](./supabase/SETUP_PART3.sql) — incidencias + realtime KDS

## 3. Crear usuarios Auth

En **Authentication → Users → Add user**:

| Email | Password | Luego en tabla `profiles` |
| --- | --- | --- |
| tu-email-real@gmail.com | sacha2026 | role=`admin`, sucursal_id=null |

Insert de perfil (reemplaza `USER_UUID`):

```sql
insert into public.profiles (id, email, full_name, role, sucursal_id, active)
values (
  'USER_UUID',
  'tu-email-real@gmail.com',
  'Admin Sacha Wasi',
  'admin',
  null,
  true
);
```

También puedes iniciar sesión cloud y usar el botón **Crear perfil admin** si Auth OK y falta `profiles`.

> Tip: Auth settings → **Confirm email = OFF** para pruebas.

## 4. Qué sincroniza el frontend (modo Cloud)

Al login cloud:

- Catálogo: sucursales, categorías, productos, insumos, recetas
- Órdenes abiertas + items (KDS)
- Caja abierta de la sucursal
- Incidencias (si PART3 está aplicado)

Al vender en POS cloud: RPC `create_order_with_inventory` (stock atómico).  
KDS: suscripción realtime a `ordenes` + poll cada 20s.

## 5. Verificar

```bash
curl https://tu-preview/api/health
```

Esperado:

```json
{
  "mode": "supabase",
  "supabase": { "configured": true, "reachable": true, "schemaReady": true }
}
```

Si el seed está vacío, PART2 debe devolver conteos > 0. El login **Demo local** sigue disponible sin cloud.
