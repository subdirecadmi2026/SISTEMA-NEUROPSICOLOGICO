<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\InventoryController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\RecipeController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:login');

Route::middleware(['auth:sanctum', \App\Http\Middleware\SetCurrentContext::class])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/switch-branch', [AuthController::class, 'switchBranch']);

    Route::get('/dashboard', [DashboardController::class, 'show']);
    Route::get('/lookups', [DashboardController::class, 'lookups']);

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
});
