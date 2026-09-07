<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MediaController extends Controller
{
    public function show(string $file): BinaryFileResponse
    {
        abort_unless(preg_match('/^[A-Za-z0-9._-]+$/', $file) === 1, 404);

        $full = storage_path('app/public/products/'.$file);
        abort_unless(is_file($full), 404);

        return response()->file($full, [
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
