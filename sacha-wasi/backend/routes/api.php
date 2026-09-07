<?php

use App\Http\Controllers\Api\V1\AuditController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CashController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DeliveryController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\FiscalController;
use App\Http\Controllers\Api\V1\InventoryController;
use App\Http\Controllers\Api\V1\KitchenController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\PublicMenuController;
use App\Http\Controllers\Api\V1\PurchaseController;
use App\Http\Controllers\Api\V1\RecipeController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\ReservationController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\SupplierController;
use App\Http\Controllers\Api\V1\TableController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:login');

Route::get('/public/menu/{qrToken}', [PublicMenuController::class, 'show']);
Route::post('/public/menu/{qrToken}/orders', [PublicMenuController::class, 'order'])
    ->middleware('throttle:20,1');

Route::middleware(['auth:sanctum', \App\Http\Middleware\SetCurrentContext::class])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/switch-branch', [AuthController::class, 'switchBranch']);

    Route::get('/dashboard', [DashboardController::class, 'show']);
    Route::get('/lookups', [DashboardController::class, 'lookups']);
    Route::get('/reports', [ReportController::class, 'show']);
    Route::get('/settings', [SettingsController::class, 'show']);
    Route::patch('/settings', [SettingsController::class, 'update']);
    Route::get('/audit', [AuditController::class, 'index']);

    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('products', ProductController::class);
    Route::apiResource('recipes', RecipeController::class)->except(['destroy']);
    Route::get('/products/{product}/cost', [RecipeController::class, 'cost']);
    Route::get('/products/{product}/explode', [InventoryController::class, 'consumePreview']);

    Route::get('/inventory/stock', [InventoryController::class, 'stock']);
    Route::get('/inventory/kardex', [InventoryController::class, 'kardex']);
    Route::post('/inventory/receive', [InventoryController::class, 'receive']);
    Route::post('/inventory/adjust', [InventoryController::class, 'adjust']);
    Route::post('/inventory/transfers', [InventoryController::class, 'transfer']);

    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::post('/orders/quick-sale', [OrderController::class, 'quickSale']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::post('/orders/{order}/items', [OrderController::class, 'addItem']);
    Route::delete('/orders/{order}/items/{item}', [OrderController::class, 'removeItem']);
    Route::post('/orders/{order}/send-to-kitchen', [OrderController::class, 'sendToKitchen']);
    Route::post('/orders/{order}/pay', [OrderController::class, 'pay']);
    Route::post('/orders/{order}/void', [OrderController::class, 'void']);

    Route::get('/kitchen/tickets', [KitchenController::class, 'tickets']);
    Route::post('/kitchen/items/{item}/advance', [KitchenController::class, 'advance']);

    Route::get('/tables', [TableController::class, 'index']);
    Route::patch('/tables/{table}/status', [TableController::class, 'updateStatus']);

    Route::get('/cash/registers', [CashController::class, 'registers']);
    Route::get('/cash/current', [CashController::class, 'current']);
    Route::post('/cash/open', [CashController::class, 'open']);
    Route::post('/cash/sessions/{session}/move', [CashController::class, 'move']);
    Route::post('/cash/sessions/{session}/close', [CashController::class, 'close']);

    Route::get('/fiscal-documents', [FiscalController::class, 'index']);
    Route::get('/fiscal-documents/{fiscalDocument}', [FiscalController::class, 'show']);
    Route::post('/fiscal-documents/{fiscalDocument}/retry', [FiscalController::class, 'retry']);

    Route::get('/customers', [CustomerController::class, 'index']);
    Route::post('/customers', [CustomerController::class, 'store']);
    Route::get('/customers/{customer}', [CustomerController::class, 'show']);
    Route::patch('/customers/{customer}', [CustomerController::class, 'update']);

    Route::get('/suppliers', [SupplierController::class, 'index']);
    Route::post('/suppliers', [SupplierController::class, 'store']);
    Route::patch('/suppliers/{supplier}', [SupplierController::class, 'update']);

    Route::get('/purchases', [PurchaseController::class, 'index']);
    Route::post('/purchases', [PurchaseController::class, 'store']);
    Route::post('/purchases/{purchaseOrder}/approve', [PurchaseController::class, 'approve']);
    Route::post('/purchases/{purchaseOrder}/receive', [PurchaseController::class, 'receive']);

    Route::get('/reservations', [ReservationController::class, 'index']);
    Route::post('/reservations', [ReservationController::class, 'store']);
    Route::patch('/reservations/{reservation}', [ReservationController::class, 'update']);

    Route::get('/delivery', [DeliveryController::class, 'index']);
    Route::post('/delivery/{order}/assign', [DeliveryController::class, 'assign']);

    Route::get('/expenses', [ExpenseController::class, 'index']);
    Route::post('/expenses', [ExpenseController::class, 'store']);

    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::get('/roles', [UserController::class, 'roles']);
});
