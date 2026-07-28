# Conectar Sacha Wasi a Supabase

Proyecto: `https://jmpebicnieuvmjpfjyud.supabase.co`

## 1. Variables (ya configuradas en el entorno del agente)

```env
NEXT_PUBLIC_SUPABASE_URL=https://jmpebicnieuvmjpfjyud.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

En Vercel: Root Directory = `sacha-wasi` + las mismas variables.

## 2. Crear el esquema (obligatorio)

1. Abre Supabase → **SQL Editor** → New query  
2. Copia TODO el contenido de [`supabase/SETUP.sql`](./supabase/SETUP.sql)  
3. Run / Ejecutar  

Eso crea tablas, RLS, función de venta atómica y datos demo de catálogo.

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

> Tip: en Auth settings puedes activar **Confirm email = OFF** para pruebas.

## 4. Verificar

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

Hasta que `schemaReady` sea true, el frontend sigue operando en **modo demo** (localStorage) para que puedas usar el sistema sin bloquearte.
