<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return [
        'name' => 'Sacha Wasi',
        'product' => 'ERP Gastronómico',
        'api' => '/api/v1',
        'health' => '/up',
    ];
});
