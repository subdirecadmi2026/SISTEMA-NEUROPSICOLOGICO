# Control de Enfermería

Sistema para planificar y controlar horarios del personal de enfermería.

## Módulos

- Horarios mensuales y cuadrícula de turnos
- Personal de enfermería
- Usuarios y perfiles: administrador, supervisor y jefe de enfermería
- Servicios hospitalarios
- Claves de turno, jornadas y horas computables
- Flujo de revisión y aprobación

Los permisos se aplican en la interfaz y en PostgreSQL mediante Row Level
Security. Sin credenciales de Supabase, la aplicación activa un modo
demostrativo con persistencia local.

## Configuración de Supabase

1. Crea un proyecto en Supabase.
2. Copia `.env.example` como `.env.local`.
3. Completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Vincula el proyecto y aplica la migración:

```sh
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
npx supabase functions deploy invite-user
```

La primera persona que se registre crea la organización y recibe el perfil
Administrador. Los siguientes usuarios deben ser invitados por un
administrador. La función Edge usa `SUPABASE_SERVICE_ROLE_KEY` únicamente
dentro de Supabase; nunca se expone en el navegador.

## Desarrollo

```sh
npm install
npm run dev
```

## Verificación

```sh
npm run lint
npm run typecheck
npm run build
```
