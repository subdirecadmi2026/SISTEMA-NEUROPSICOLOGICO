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
                'permissions' => array_diff(
                    Permission::query()->pluck('name')->all(),
                    ['users.manage']
                ),
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
                ]),
            ],
            'mesero' => [
                'label' => 'Mesero',
                'description' => 'Consulta de menú y venta',
                'permissions' => array_merge($catalog, ['pos.sell']),
            ],
            'cajero' => [
                'label' => 'Cajero',
                'description' => 'POS y cobro',
                'permissions' => array_merge($catalog, ['pos.sell', 'pos.discount', 'inventory.stock.view']),
            ],
            'cocina' => [
                'label' => 'Cocina',
                'description' => 'Consulta de recetas y KDS',
                'permissions' => ['catalog.products.view', 'catalog.recipes.view'],
            ],
            'compras' => [
                'label' => 'Compras',
                'description' => 'Abastecimiento',
                'permissions' => array_merge($catalog, ['inventory.stock.view', 'inventory.receive']),
            ],
            'contabilidad' => [
                'label' => 'Contabilidad',
                'description' => 'Consulta financiera y kardex',
                'permissions' => array_merge($catalog, ['inventory.stock.view', 'inventory.kardex.view']),
            ],
            'supervisor' => [
                'label' => 'Supervisor',
                'description' => 'Supervisión de sala y caja',
                'permissions' => array_merge($catalog, ['pos.sell', 'pos.discount', 'pos.void', 'inventory.stock.view']),
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
