# Sacha Wasi

Sistema web de gestión para la cadena de comida rápida **Sacha Wasi**.
Multi‑sucursal, roles RBAC, POS, KDS, recetas/escandallos, inventario, caja y reportes.

Stack: **Next.js (TypeScript) + Vercel + Supabase**. Independiente de NeuroSys.

## Preview en vivo (desarrollo)

**https://praise-already-accompanied-touch.trycloudflare.com/login**

Login demo: `admin@sachawasi.pe` / `sacha2026`

> Evita `loca.lt` (pide IP y suele bloquear). Usa el link de Cloudflare.
> Si el túnel se reinicia, el agente te pasará un link nuevo.

Supabase destino: `https://jmpebicnieuvmjpfjyud.supabase.co`  
Estado: Auth + esquema + sync cloud (POS/KDS/caja/catálogo/incidencias).  
Ejecuta en orden: [`SETUP.sql`](./supabase/SETUP.sql) → [`SETUP_PART2.sql`](./supabase/SETUP_PART2.sql) → [`SETUP_PART3.sql`](./supabase/SETUP_PART3.sql)  
y crea un usuario Auth + fila en `profiles`. Guía: [SETUP_SUPABASE.md](./SETUP_SUPABASE.md).

## Modo demo (sin Supabase)

```bash
cd sacha-wasi
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) e inicia sesión:

| Rol | Email | Contraseña |
| --- | --- | --- |
| Admin | `admin@sachawasi.pe` | `sacha2026` |
| Supervisor | `supervisor@sachawasi.pe` | `sacha2026` |
| Caja | `caja@sachawasi.pe` | `sacha2026` |
| Cocina | `cocina@sachawasi.pe` | `sacha2026` |
| Inventario | `inventario@sachawasi.pe` | `sacha2026` |

## MVP incluido

- **POS**: pedidos, canales, mesas, cupones, clientes, ticket; cloud vía RPC atómica
- **KDS**: columnas + demora + beep + realtime Supabase
- **Recetas**: escandallo, costo y margen por plato
- **Inventario**: stock, lotes, mermas, alertas de mínimo
- **Compras**: proveedores, recepción e ingreso de stock
- **RRHH**: turnos y fichaje entrada/salida
- **Fidelización**: clientes, puntos y cupones
- **Caja**: apertura/cierre local y cloud
- **Incidencias**: reportes operativos por sucursal
- **Reportes**: KPIs + export CSV + consolidado admin
- **Usuarios / RBAC + auditoría**
- Schema SQL con **RLS**, seed y `create_order_with_inventory`

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # build producción
npm run start      # servidor producción
npm run lint       # eslint
npm run typecheck  # TypeScript
```

## Variables de entorno

Copia `.env.example` → `.env.local` y completa:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Guía completa: [DEPLOY.md](./DEPLOY.md)

## Estructura

```
sacha-wasi/
  src/app/           # rutas (pos, kds, recetas, inventario, caja, incidencias…)
  src/components/    # UI por módulo
  src/lib/           # demo store, roles, supabase clients
  supabase/          # SETUP.sql + PART2 + PART3 + migraciones
```

## Roadmap post‑MVP

Forecasting, terminal fiscal, app riders,
integraciones Rappi/Uber Eats y pasarelas (MercadoPago/Stripe).
