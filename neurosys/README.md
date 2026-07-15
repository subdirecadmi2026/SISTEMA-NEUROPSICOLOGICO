# NeuroSys ERP

ERP clínico para el Centro Neuroterapéutico Integral Ñampi Wasi. Incluye
dashboard conectado, pacientes, agenda semanal, expediente 360°, evoluciones
clínicas firmadas, evaluaciones, planes terapéuticos, informes, comunicaciones,
facturación interna, autenticación y persistencia multiempresa.

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
4. Vincula y aplica la migración:

```sh
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
```

Las migraciones crean organizaciones, sedes, perfiles, membresías, pacientes,
citas, evoluciones, evaluaciones, terapias, informes, comunicaciones,
comprobantes internos, pagos, auditoría y políticas RLS. Después de crear el
primer usuario en Supabase Auth, inicia sesión en NeuroSys. El asistente inicial
creará la organización y su primera sede.

No utilices una clave `service_role` en el frontend. Las acciones normales usan
la clave pública y quedan limitadas por las políticas RLS.

## Calidad

```sh
npm run lint
npm run typecheck
npm run build
```

## Producción

Consulta [`DEPLOY.md`](./DEPLOY.md) para configurar Supabase Auth, aplicar las
migraciones y desplegar en Vercel con `neurosys` como directorio raíz.
