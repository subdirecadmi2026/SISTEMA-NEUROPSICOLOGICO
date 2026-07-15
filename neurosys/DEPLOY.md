# Despliegue de NeuroSys

## 1. Preparar Supabase

1. Crea un proyecto y guarda su `Project ref`, URL y clave pública
   `publishable` (o `anon`).
2. Desde `neurosys/`, autentica y vincula la CLI:

   ```sh
   npx supabase login
   npx supabase link --project-ref TU_PROJECT_REF
   npx supabase db push
   ```

3. Confirma en **Database > Migrations** que se aplicaron:
   - `20260715000000_initial_clinical_core.sql`
   - `20260715010000_clinical_records.sql`
   - `20260715020000_tenant_integrity.sql`
   Si el proyecto ya contiene datos, crea una copia antes de `db push`. La
   tercera migración rechazará registros históricos que relacionen
   organizaciones o sedes distintas; corrige esas filas antes de reintentar.
4. En **Authentication > URL Configuration**, configura:
   - Site URL: el dominio final de Vercel.
   - Redirect URLs: el dominio final y `https://*-TU-EQUIPO.vercel.app/**`
     para previews.
5. En **Authentication > Providers > Email**, decide el alta de usuarios:
   - Para operación institucional, deshabilita el registro público.
   - Crea el primer usuario desde **Authentication > Users**.

Las políticas RLS son obligatorias. Nunca configures `service_role` en Vercel.

## 2. Crear el proyecto en Vercel

Importa este repositorio y usa:

| Ajuste | Valor |
| --- | --- |
| Framework | Next.js |
| Root Directory | `neurosys` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Node.js | 20.x o superior |

Configura para Production, Preview y Development:

```text
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
```

No configures `SUPABASE_DB_URL` en Vercel: solo se usa para tareas
administrativas. Un despliegue de Vercel sin las dos variables públicas
responde `503` en vez de exponer el modo demostrativo.

## 3. Primera puesta en marcha

1. Abre `/api/health`; debe responder `200` con `"status":"ok"`.
2. Inicia sesión con el primer usuario de Supabase.
3. Completa `/onboarding` para crear organización y sede.
4. Crea un paciente.
5. Agenda una cita. El primer `super_admin` puede actuar como profesional.
6. Abre el expediente y firma una evolución clínica.

Las evoluciones firmadas son inmutables; una corrección debe registrarse como
una nueva evolución. Los cambios quedan trazados en `audit_logs` sin copiar
contenido clínico.

## 4. Verificación antes de producción

Desde `neurosys/`:

```sh
npm ci
npm run lint
npm run typecheck
npm run build
npx supabase db lint --linked
```

Después del despliegue:

```sh
curl --fail https://TU_DOMINIO/api/health
curl -I https://TU_DOMINIO/pacientes
```

La segunda petición, sin sesión, debe redirigir a `/login`.

## 5. Copias y operación

- Activa Point-in-Time Recovery o copias diarias según el plan de Supabase.
- Restringe el acceso al dashboard de Supabase y habilita MFA para el equipo.
- Revisa periódicamente `audit_logs`.
- Prueba restauraciones antes de almacenar información clínica real.
- Usa un proyecto Supabase separado para previews; no conectes previews a
  producción.
