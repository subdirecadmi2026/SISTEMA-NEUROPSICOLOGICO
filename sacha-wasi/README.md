# Sacha Wasi

Sistema web de gestión para la cadena de comida rápida **Sacha Wasi**.
Multi‑sucursal, roles RBAC, POS, KDS, recetas/escandallos, inventario, caja y reportes.

Stack: **Next.js (TypeScript) + Vercel + Supabase**. Independiente de NeuroSys.

## Preview en vivo (desarrollo)

**https://marshall-guidelines-knowing-dts.trycloudflare.com/login**

Login demo: `admin@sachawasi.pe` / `sacha2026`

> Evita `loca.lt` (pide IP y suele bloquear). Usa el link de Cloudflare de arriba.
> Si el túnel se reinicia, el agente te pasará un link nuevo.

Supabase destino: `https://jmpebicnieuvmjpfjyud.supabase.co`  
(Falta configurar la clave `anon` / publishable en `.env.local` y Vercel.)

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

- **POS**: pedidos, canales, mesas, cupones, clientes, ticket imprimible
- **KDS**: columnas recibido / preparación / listo con alertas de demora
- **Recetas**: escandallo, costo y margen por plato
- **Inventario**: stock, lotes, mermas, alertas de mínimo
- **Compras**: proveedores, recepción e ingreso de stock
- **RRHH**: turnos y fichaje entrada/salida
- **Fidelización**: clientes, puntos y cupones
- **Caja**: apertura, esperado, cierre y discrepancia
- **Reportes**: KPIs + export CSV + consolidado admin
- **Usuarios / RBAC + auditoría** de acciones
- Schema SQL con **RLS** y función atómica `create_order_with_inventory`

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
  src/app/           # rutas (pos, kds, recetas, inventario, caja, reportes…)
  src/components/    # UI por módulo
  src/lib/           # demo store, roles, supabase clients
  supabase/          # migraciones + seed
```

## Roadmap post‑MVP

RRHH/turnos, fidelización, forecasting, terminal fiscal, app riders,
integraciones Rappi/Uber Eats y pasarelas (MercadoPago/Stripe).
