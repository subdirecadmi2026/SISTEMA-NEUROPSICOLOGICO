# NeuroSys ERP

ERP clínico para el Centro Neuroterapéutico Integral Ñampi Wasi. Incluye
dashboard conectado, pacientes, agenda semanal y mensual con flujo de estados,
expediente 360°, evoluciones clínicas firmadas, evaluaciones, planes
terapéuticos, informes, comunicaciones, facturación interna, autenticación y
persistencia multiempresa.

También incorpora recuperación y cambio de contraseña, gestión de equipo y
roles, e invitaciones por correo mediante la Edge Function `invite-member`.

## Tecnologías

- Next.js con App Router
- React y TypeScript
- Tailwind CSS
- Lucide Icons
- Supabase Auth y PostgreSQL
- Zod

## Desarrollo

Desde el directorio `neurosys`:

```sh
npm install
npm run dev
```

Sin variables de entorno, NeuroSys se ejecuta en modo demostrativo. Para
habilitar persistencia:

1. Crea un proyecto en Supabase.
2. Copia `.env.example` como `.env.local`.
3. Completa la URL y la clave pública del proyecto.
4. Vincula y aplica las seis migraciones:

```sh
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
```

Las migraciones crean organizaciones, sedes, perfiles, membresías, pacientes,
citas y su flujo operativo, evoluciones, evaluaciones, terapias, informes,
comunicaciones, comprobantes internos, pagos, auditoría y políticas RLS. Deben
aplicarse en el orden indicado en [`DEPLOY.md`](./DEPLOY.md). Después de crear
el primer usuario en Supabase Auth, inicia sesión en NeuroSys. El asistente
inicial creará la organización y su primera sede.

No utilices `SUPABASE_SERVICE_ROLE_KEY` en el frontend ni en Vercel. Supabase
la provee automáticamente dentro de la Edge Function; las acciones normales
usan la clave pública y quedan limitadas por las políticas RLS.

## Calidad

```sh
npm run lint
npm run typecheck
npm run build
```

## Producción

Consulta [`DEPLOY.md`](./DEPLOY.md) para configurar Supabase Auth, aplicar las
migraciones y desplegar en Vercel con `neurosys` como directorio raíz.
