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

3. Confirma en **Database > Migrations** que se aplicaron estas seis
   migraciones, exactamente en este orden:
   - `20260715000000_initial_clinical_core.sql`
   - `20260715010000_clinical_records.sql`
   - `20260715020000_tenant_integrity.sql`
   - `20260715030000_operational_modules.sql`
   - `20260721000000_team_security.sql`
   - `20260721010000_appointment_workflow.sql`

   Si el proyecto ya contiene datos, crea una copia antes de `db push`. La
   tercera migración rechazará registros históricos que relacionen
   organizaciones o sedes distintas; corrige esas filas antes de reintentar.
4. En **Authentication > URL Configuration**, configura:
   - **Site URL**: `https://TU_DOMINIO`.
   - **Redirect URLs**:
     `https://TU_DOMINIO/auth/callback`,
     `https://TU_DOMINIO/auth/callback?next=/configuracion/cuenta` y, si usas
     previews, `https://*-TU_EQUIPO.vercel.app/auth/callback`.
5. En **Authentication > Email > SMTP Settings**, habilita SMTP personalizado
   y configura host, puerto, usuario, contraseña, remitente y correo del
   remitente. Se recomienda un proveedor transaccional para que invitaciones y
   restablecimientos no dependan del servicio SMTP limitado de Supabase.
6. En **Authentication > Providers > Email**, decide el alta de usuarios:
   - Para operación institucional, deshabilita el registro público.
   - Crea el primer usuario desde **Authentication > Users**.
7. Configura y despliega la función de invitaciones:

   ```sh
   npx supabase secrets set APP_ORIGIN=https://TU_DOMINIO
   npx supabase functions deploy invite-member
   ```

`APP_ORIGIN` debe coincidir con el origen público, sin ruta ni `/` final.
Supabase provee `SUPABASE_SERVICE_ROLE_KEY` automáticamente dentro de la Edge
Function. Nunca la copies al frontend, a variables `NEXT_PUBLIC_*` ni a Vercel.
Las políticas RLS son obligatorias.

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
4. Desde `/configuracion/usuarios`, invita al equipo y asigna sus roles.
5. Crea un paciente.
6. Agenda una cita. El primer `super_admin` puede actuar como profesional.
7. Usa las vistas semana/mes y avanza la cita por sus estados: pendiente,
   confirmada, llegada, en atención y completada. Cancelada y no asistió son
   cierres alternativos; cancelar exige un motivo.
8. Abre el expediente y firma una evolución clínica.

Las evoluciones firmadas son inmutables; una corrección debe registrarse como
una nueva evolución. Los cambios quedan trazados en `audit_logs` sin copiar
contenido clínico.

El módulo de facturación genera comprobantes y saldos internos. No sustituye la
facturación electrónica ni la autorización tributaria del SRI.

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

### Smoke test

- [ ] **Invitación:** un `super_admin` o director invita desde
  `/configuracion/usuarios`; el correo abre `/auth/callback`, permite establecer
  contraseña y muestra la membresía y rol correctos. Un director no puede
  otorgar `super_admin`.
- [ ] **Contraseña:** solicita el restablecimiento desde
  `/recuperar-contrasena`; el enlace vuelve por `/auth/callback` a
  `/configuracion/cuenta`, permite cambiarla y la nueva contraseña inicia
  sesión.
- [ ] **Roles:** cambia rol y estado activo de otro miembro; comprueba sus
  permisos, que nadie se desactive a sí mismo y que permanezca al menos un
  `super_admin`.
- [ ] **Cita:** crea una cita pendiente, visualízala en semana y mes, confirma,
  registra llegada, inicia y completa. En otra cita prueba no asistió y en otra
  cancelación con motivo.

## 5. Copias y operación

- Activa Point-in-Time Recovery o copias diarias según el plan de Supabase.
- Restringe el acceso al dashboard de Supabase y habilita MFA para el equipo.
- Revisa periódicamente `audit_logs`.
- Prueba restauraciones antes de almacenar información clínica real.
- Usa un proyecto Supabase separado para previews; no conectes previews a
  producción.
