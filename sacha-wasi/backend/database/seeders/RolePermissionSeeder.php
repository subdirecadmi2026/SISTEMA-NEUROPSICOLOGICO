<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['catalog.categories.view', 'Catálogo', 'Ver categorías'],
            ['catalog.categories.manage', 'Catálogo', 'Crear y editar categorías'],
            ['catalog.products.view', 'Catálogo', 'Ver productos'],
            ['catalog.products.manage', 'Catálogo', 'Crear y editar productos'],
            ['catalog.recipes.view', 'Catálogo', 'Ver recetas y costeo'],
            ['catalog.recipes.manage', 'Catálogo', 'Crear y editar recetas'],
            ['inventory.stock.view', 'Inventario', 'Ver stock'],
            ['inventory.kardex.view', 'Inventario', 'Ver kardex'],
            ['inventory.receive', 'Inventario', 'Ingresar mercadería'],
            ['inventory.adjust', 'Inventario', 'Ajustar inventario'],
            ['inventory.transfer', 'Inventario', 'Trasladar entre bodegas'],
            ['inventory.count', 'Inventario', 'Conteo físico'],
            ['pos.sell', 'POS', 'Vender'],
            ['pos.discount', 'POS', 'Aplicar descuentos'],
            ['pos.void', 'POS', 'Anular comprobantes'],
            ['kds.view', 'Cocina', 'Ver KDS'],
            ['kds.advance', 'Cocina', 'Avanzar tickets de cocina'],
            ['tables.view', 'Sala', 'Ver mesas'],
            ['tables.manage', 'Sala', 'Cambiar estado de mesas'],
            ['cash.view', 'Caja', 'Ver caja'],
            ['cash.open', 'Caja', 'Abrir caja'],
            ['cash.move', 'Caja', 'Ingresos y retiros'],
            ['cash.close', 'Caja', 'Cerrar caja y arqueo'],
            ['fiscal.view', 'Facturación', 'Ver comprobantes'],
            ['fiscal.retry', 'Facturación', 'Reintentar autorización SRI'],
            ['customers.view', 'CRM', 'Ver clientes'],
            ['customers.manage', 'CRM', 'Gestionar clientes'],
            ['suppliers.view', 'Compras', 'Ver proveedores'],
            ['suppliers.manage', 'Compras', 'Gestionar proveedores'],
            ['purchases.view', 'Compras', 'Ver órdenes de compra'],
            ['purchases.manage', 'Compras', 'Crear órdenes de compra'],
            ['purchases.approve', 'Compras', 'Aprobar órdenes'],
            ['purchases.receive', 'Compras', 'Recibir mercadería'],
            ['reservations.view', 'Reservas', 'Ver reservas'],
            ['reservations.manage', 'Reservas', 'Gestionar reservas'],
            ['delivery.view', 'Delivery', 'Ver entregas'],
            ['delivery.manage', 'Delivery', 'Asignar riders'],
            ['expenses.view', 'Finanzas', 'Ver gastos'],
            ['expenses.manage', 'Finanzas', 'Registrar gastos'],
            ['reports.view', 'Reportes', 'Ver reportes'],
            ['audit.view', 'Seguridad', 'Ver bitácora'],
            ['settings.view', 'Configuración', 'Ver configuración'],
            ['settings.manage', 'Configuración', 'Editar configuración'],
            ['users.manage', 'Seguridad', 'Administrar usuarios y permisos'],
        ];

        foreach ($permissions as [$name, $group, $label]) {
            Permission::query()->updateOrCreate(
                ['name' => $name, 'guard_name' => 'web'],
                ['group' => $group, 'label' => $label]
            );
        }

        $catalog = [
            'catalog.categories.view',
            'catalog.products.view',
            'catalog.recipes.view',
        ];

        $roles = [
            'administrador' => [
                'label' => 'Administrador',
                'description' => 'Acceso total a la compañía',
                'permissions' => Permission::query()->pluck('name')->all(),
            ],
            'gerente' => [
                'label' => 'Gerente',
                'description' => 'Operación y reportería de sucursal',
                'permissions' => array_values(array_diff(
                    Permission::query()->pluck('name')->all(),
                    ['users.manage']
                )),
            ],
            'bodega' => [
                'label' => 'Bodega',
                'description' => 'Inventario, ingresos y traslados',
                'permissions' => array_merge($catalog, [
                    'inventory.stock.view',
                    'inventory.kardex.view',
                    'inventory.receive',
                    'inventory.adjust',
                    'inventory.transfer',
                    'inventory.count',
                    'purchases.view',
                    'purchases.receive',
                    'suppliers.view',
                ]),
            ],
            'mesero' => [
                'label' => 'Mesero',
                'description' => 'Sala, menú y toma de pedidos',
                'permissions' => array_merge($catalog, [
                    'pos.sell', 'tables.view', 'tables.manage', 'kds.view',
                    'customers.view', 'reservations.view', 'reservations.manage',
                ]),
            ],
            'cajero' => [
                'label' => 'Cajero',
                'description' => 'POS, cobro y caja',
                'permissions' => array_merge($catalog, [
                    'pos.sell', 'pos.discount', 'inventory.stock.view',
                    'cash.view', 'cash.open', 'cash.move', 'cash.close',
                    'fiscal.view', 'customers.view', 'customers.manage', 'tables.view',
                ]),
            ],
            'cocina' => [
                'label' => 'Cocina',
                'description' => 'KDS y recetas',
                'permissions' => ['catalog.products.view', 'catalog.recipes.view', 'kds.view', 'kds.advance'],
            ],
            'compras' => [
                'label' => 'Compras',
                'description' => 'Abastecimiento',
                'permissions' => array_merge($catalog, [
                    'inventory.stock.view', 'inventory.receive',
                    'suppliers.view', 'suppliers.manage',
                    'purchases.view', 'purchases.manage', 'purchases.approve', 'purchases.receive',
                ]),
            ],
            'contabilidad' => [
                'label' => 'Contabilidad',
                'description' => 'Consulta financiera, SRI y kardex',
                'permissions' => array_merge($catalog, [
                    'inventory.stock.view', 'inventory.kardex.view',
                    'fiscal.view', 'fiscal.retry', 'reports.view',
                    'expenses.view', 'expenses.manage', 'audit.view', 'cash.view',
                ]),
            ],
            'supervisor' => [
                'label' => 'Supervisor',
                'description' => 'Supervisión de sala y caja',
                'permissions' => array_merge($catalog, [
                    'pos.sell', 'pos.discount', 'pos.void', 'inventory.stock.view',
                    'tables.view', 'tables.manage', 'kds.view', 'cash.view',
                    'fiscal.view', 'reports.view', 'customers.view',
                ]),
            ],
        ];

        foreach ($roles as $name => $config) {
            $role = Role::query()->updateOrCreate(
                ['name' => $name, 'guard_name' => 'web'],
                ['label' => $config['label'], 'description' => $config['description']]
            );
            $role->syncPermissions($config['permissions']);
        }
    }
}
