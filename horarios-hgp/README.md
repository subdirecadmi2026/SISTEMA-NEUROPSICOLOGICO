# Sistema de Horarios — Hospital General Puyo (MSP Ecuador)

Aplicación web para elaborar el **cuadro de trabajo mensual** de personal directo o indirecto, con plantillas oficiales de **Enfermería** y **Médico**.

## Requisitos

- Node.js 20+
- npm 10+
- (Opcional) Proyecto Supabase dedicado — **no** reutilizar la BD de NeuroSys

## Instalación

```bash
cd horarios-hgp
cp .env.example .env
npm install
npm run dev
```

Abra `http://localhost:5173`.

### Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase (dejar placeholder para modo local) |
| `VITE_SUPABASE_ANON_KEY` | Clave anon / publishable |

Sin Supabase configurado, todo funciona con **localStorage** (ideal para pruebas).

### Base de datos (Fase 2)

```bash
# En el SQL Editor de Supabase, ejecute:
# supabase/migrations/20260722000000_horarios_hgp.sql
```

Tablas: `hgp_users`, `services`, `staff`, `schedules`, `schedule_cells`, `approvals`, `contingency`, `audit_log`.

## Scripts

```bash
npm run dev       # desarrollo
npm run build     # producción
npm run preview   # vista previa del build
npm test          # tests unitarios (horas, cobertura, feriados)
npm run lint      # oxlint
```

## Uso rápido (jefe de servicio)

1. **Entrar** como **Jefe** (selector arriba).
2. Elegir plantilla **Enfermería** o **Médico**, mes, año y servicio.
3. Pestaña **PERSONAL**: CRUD, descargar plantilla Excel, importar CSV/Excel, «Cargar al horario».
4. Pestaña **HORARIO**: seleccionar clave y pintar celdas (clic derecho borra).
5. **Limpiar mes** / **Duplicar mes anterior** / **Autocompletar feriados**.
6. Revisar **DISTRIBUCIÓN** (rojo = cobertura bajo umbral) y **CONTINGENCIA**.
7. **Guardar**, **Exportar Excel** o **Imprimir / PDF**.
8. **Enviar a revisión** → **Revisor** aprueba o devuelve con comentario → **Validador** valida (queda bloqueado).

### Roles

| Rol | Función |
|-----|---------|
| `lider_servicio` (Jefe) | Crea y edita horarios; envía a revisión |
| `revisor` | Solo visualiza; aprueba o pide corrección con comentario |
| `validador` | Valida formalmente el horario aprobado |
| `admin` | Todo + reabrir cerrados |

Roles institucionales legacy (`gestion_enfermeria`, `subdireccion`, `direccion_asistencial`, `talento_humano`) siguen mapeados a revisor/validador.

## Despliegue (Vercel)

Ver guía completa en [`DEPLOY.md`](./DEPLOY.md).

1. Importar el repo; **Root Directory** = `horarios-hgp`.
2. Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Deploy. `vercel.json` ya apunta al build de Vite.

## Plantillas oficiales

### Enfermería
Claves: A1, A2, E2, E5, D1, N1, EN, HA, M, T, MN, MT + ausencias V, F, PS, CD, HL, CM, L, P.

### Médico
Claves: X, PT1, PT2, CE, HA, HM, HD, HE, A2 · Áreas H, E, QX, GD, IN · Ausencias C, V, INC, CAP, CO, L, IND, P, F.

## Arquitectura

```
src/
  components/   # UI modular
  data/         # claves oficiales + demo
  lib/          # calendario, excel, auth, api, validaciones
  App.tsx       # orquestación
supabase/       # migraciones SQL
```

Persistencia: localStorage siempre; Supabase si hay variables válidas.
