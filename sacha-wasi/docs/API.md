# API REST `/api/v1`

Autenticación: `Authorization: Bearer <token>` (Sanctum).

Sucursal activa: header opcional `X-Branch-Id`.

Rate limit de login: 8/min por email+IP.

## Auth

| Método | Ruta | Permiso |
| --- | --- | --- |
| POST | `/auth/login` | público |
| GET | `/auth/me` | autenticado |
| POST | `/auth/logout` | autenticado |
| POST | `/auth/switch-branch` | autenticado |

## Catálogo e inventario

| Método | Ruta | Permiso |
| --- | --- | --- |
| GET | `/dashboard` | `catalog.products.view` |
| GET | `/lookups` | `catalog.products.view` |
| CRUD | `/categories` | `catalog.categories.view` / `.manage` |
| CRUD | `/products` | `catalog.products.view` / `.manage` |
| GET/POST/PATCH | `/recipes` | `catalog.recipes.view` / `.manage` |
| GET | `/products/{id}/cost` | `catalog.recipes.view` |
| GET | `/products/{id}/explode?quantity=` | `inventory.stock.view` |
| GET | `/inventory/stock` | `inventory.stock.view` |
| GET | `/inventory/kardex` | `inventory.kardex.view` |
| POST | `/inventory/receive` | `inventory.receive` |
| POST | `/inventory/adjust` | `inventory.adjust` |
| POST | `/inventory/transfers` | `inventory.transfer` |

Búsqueda de productos: `?search=`, `?type=`, `?category_id=`, `?status=`.
