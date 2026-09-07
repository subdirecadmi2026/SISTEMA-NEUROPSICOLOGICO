# Sacha Wasi — ERP Gastronómico

Sistema ERP para restaurantes, cadenas, franquicias y dark kitchens, con
cumplimiento SRI (Ecuador) en el diseño y operación **multi-sucursal** desde
el primer commit.

Esta entrega cubre **Fase 0 (fundaciones)** y **Fase 1 (catálogo operativo)**:
categorías, productos, recetas e inventario/kardex.

NeuroSys (ERP clínico) permanece en [`../neurosys`](../neurosys).

## Stack

| Capa | Tecnología |
| --- | --- |
| API | Laravel 13, PHP 8.3, Sanctum, Spatie Permission |
| App | React 19, Vite 8, Tailwind CSS 4, PWA (manifest) |
| Datos | PostgreSQL en producción · SQLite en desarrollo/tests |
| Precisión | bcmath para costeo, mermas y stock |

## Arranque local

```sh
# API
cd backend
composer install
cp .env.example .env   # si aún no existe
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve --host=127.0.0.1 --port=8000

# App (otra terminal)
cd frontend
npm install
npm run dev
```

Abre `http://127.0.0.1:5173`.

### Usuarios de demostración

| Correo | Rol | Contraseña |
| --- | --- | --- |
| `admin@sachawasi.ec` | Administrador | `password` |
| `bodega@sachawasi.ec` | Bodega | `password` |
| `mesero@sachawasi.ec` | Mesero (no ajusta inventario) | `password` |

El seeder crea el restaurante **Sacha Wasi — Cocina de la Sierra** (Quito) con
locro de papa, seco de pollo, salsa de cilantro (sub-receta) y stock inicial
con lotes y caducidad.

## Pruebas

```sh
cd backend && php artisan test
cd frontend && npm run build
```

La lógica crítica cubierta: costeo de recetas (mermas, sub-recetas, ciclos),
explosión de BOM/combos, FEFO, kardex inmutable y permisos granulares.

## Documentación de diseño

- [Modelo de datos y decisiones](docs/FASE-1-MODELO.md)
- [API REST v1](docs/API.md)

## Qué sigue (pendiente de validación)

1. POS + KDS + mesas + caja (Fase 2)
2. Facturación electrónica SRI y contingencia (Fase 3)
3. Clientes, fidelización, reservas, delivery (Fase 4)

Decisiones abiertas listadas al final de `docs/FASE-1-MODELO.md`.
