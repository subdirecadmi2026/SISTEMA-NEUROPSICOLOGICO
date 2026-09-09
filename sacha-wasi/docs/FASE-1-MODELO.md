# Fase 1 — Modelo de datos y decisiones de diseño

Alcance: **compañía / sucursales / bodegas**, **categorías**, **productos**,
**recetas** e **inventario (kardex, lotes, traslados, ajustes)**.

Los identificadores de negocio son **ULID**. Permiten que el POS offline (Fase 2)
genere IDs en el dispositivo y los sincronice sin colisión. Roles y permisos
siguen IDs enteros de Spatie; el morph `model_id` se adaptó a ULID.

## Multi-sucursal

```
Company 1──* Branch 1──* Warehouse
   │              │
   └──── * User *─┘  (branch_user: un usuario opera N sucursales)
```

- El **catálogo** (productos, categorías, recetas, unidades, impuestos) es de la
  **compañía**.
- El **stock, la caja y las ventas** serán de la **sucursal/bodega**.
- Precios por canal (`salon`, `takeaway`, `delivery`, `qr_menu`) y por sucursal
  viven en `product_channel_prices` y `product_branch_settings`.
- El header `X-Branch-Id` selecciona la sucursal activa; si falta, se usa
  `users.current_branch_id`.

RUC se guarda con cast `encrypted` de Laravel y `ruc_hash` SHA-256 para búsqueda
y unicidad (el cifrado autenticado no es estable para índices).

## Producto: tipo vs. comportamiento de inventario

No se mezcla “qué es comercialmente” con “cómo descuenta stock”:

| `type` | Uso |
| --- | --- |
| `ingredient` | Insumo comprado |
| `simple` | Se vende tal cual (gaseosa, merch) |
| `prepared` | Plato o sub-receta |
| `combo` | Composición comercial de otros productos |
| `modifier` | Extra (queso, tocino) |
| `packaging` | Empaque |

| `inventory_behavior` | Al vender / producir |
| --- | --- |
| `tracked` | Descuenta este SKU (FEFO si `tracks_lots`) |
| `recipe_exploded` | Explota la receta hasta insumos hoja |
| `none` | Sin impacto de stock (servicio) |

Un plato **batch** (salsa pre-elaborada en cámara) puede ser `prepared` +
`tracked`: se produce (consume receta, ingresa producto terminado) y al vender
se descuenta el terminado. Un plato **make-to-order** es `recipe_exploded`.

## Variantes vs. extras vs. combos vs. sub-recetas

- **Variantes** (`product_option_groups` / `product_options` / `product_variants`):
  elecciones mutuamente excluyentes o combinatorias (tamaño, término). Pueden
  tener SKU/precio propio.
- **Extras / modificadores**: `type = modifier`. El extra puede tener receta
  propia o un `linked_product_id` para descontar inventario.
- **Combos**: `product_combo_items` describe lo que el cliente recibe. Al vender,
  cada componente aplica su propio `inventory_behavior`.
- **Sub-recetas**: un ítem de receta puede ser otro producto `prepared` (p. ej.
  salsa de cilantro usada en locro y seco). El costeo y la explosión son
  recursivos, con detección de ciclos.

Las recetas **no** son lo mismo que los combos: receta = BOM de producción;
combo = armado comercial.

## Recetas y mermas

```
recipes
  yield_quantity + yield_unit + process_waste_percent
recipe_items
  component_product + quantity + unit + waste_percent
```

Cantidad neta de un ítem:

`quantity × (1 + waste_percent/100)`

Merma de proceso (pelado masivo, merma de cocción del batch):

`unit_cost = batch_cost / yield / (1 - process_waste_percent/100)`

Las unidades se convierten por **dimensión + `factor_to_base`** (g=1, kg=1000).
Una caja de 24 unidades es `dimension=count`, `factor_to_base=24`. No hay tabla
de conversiones N×N.

## Inventario y kardex

- `stock_items`: snapshot por bodega+producto (qty, min/max, costo promedio).
- `lots`: lote, caducidad, qty, costo. FEFO ignora lotes vencidos o en cuarentena.
- `stock_movements`: **kardex append-only**. Update/delete lanzan
  `ImmutableKardexException`. Índices pensados para alto volumen
  (`warehouse_id, product_id, occurred_at`, `company_id, occurred_at`).
- Particionamiento mensual PostgreSQL de `stock_movements` queda como tarea de
  producción (la migración de Fase 1 es portable a SQLite para tests).
- Traslados y ajustes quedan documentados en tablas propias y generan dos
  movimientos (salida/entrada) o el delta correspondiente.

## Permisos

Permisos granulares (`catalog.products.manage`, `inventory.adjust`, `pos.void`,
…). Un mesero **ve** el catálogo y **no** ajusta inventario. Un usuario puede
tener un rol y permisos extra (Spatie `givePermissionTo`) — la pantalla de
matriz rol×permiso queda para el módulo Usuarios, pero el modelo ya lo soporta.

## Tablas creadas en esta fase

Tenancy: `companies`, `branches`, `warehouses`, `branch_user`, `login_attempts`
(+ `users` ULID, Sanctum, Spatie).

Catálogo: `units`, `tax_rates`, `kitchen_stations`, `categories`, `products`,
`product_images`, `product_option_groups`, `product_options`, `product_variants`,
`product_combo_items`, `product_channel_prices`, `product_branch_settings`,
`product_availability_windows`, `recipes`, `recipe_items`.

Inventario: `stock_items`, `lots`, `stock_movements`, `stock_transfers`,
`stock_transfer_items`, `stock_adjustments`, `stock_adjustment_items`,
`inventory_counts`, `inventory_count_items`.

## Decisiones abiertas (validar antes de Fase 2)

1. **Costo de receta en venta**: ¿se congela el costo al momento de la venta
   (snapshot en el ítem del pedido) o se recalcula siempre del kardex actual?
   Recomendación: snapshot, para utilidad real del día.
2. **Stock negativo**: ¿se bloquea la venta o se permite con alerta de gerente?
   Hoy el motor rechaza stock insuficiente.
3. **Bodega de descarga del POS**: ¿una bodega por sucursal o mapeo
   estación de cocina → bodega (bar vs. cocina)?
4. **IVA Ecuador**: seeder con 0%, 5% y 15%. Confirmar códigos SRI vigentes al
   implementar Fase 3.
5. **PostgreSQL vs SQLite en Cloud Agent**: tests y demo corren en SQLite;
   producción debe ser PostgreSQL. ¿Levantamos `docker-compose` con Postgres +
   Redis + Reverb en el siguiente PR?
