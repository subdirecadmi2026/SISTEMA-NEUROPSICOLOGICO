<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use App\Domain\Inventory\InsufficientStockException;
use App\Domain\Inventory\ImmutableKardexException;
use App\Domain\Recipes\CircularRecipeException;
use App\Domain\Sales\OpenCashSessionRequiredException;
use App\Domain\Sales\OrderNotPayableException;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api/v1',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (InsufficientStockException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        });

        $exceptions->render(function (CircularRecipeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        });

        $exceptions->render(function (ImmutableKardexException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        });

        $exceptions->render(function (OpenCashSessionRequiredException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        });

        $exceptions->render(function (OrderNotPayableException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        });
    })->create();
