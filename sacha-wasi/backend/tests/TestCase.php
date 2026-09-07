<?php

namespace Tests;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesSachaContext;

abstract class TestCase extends \Illuminate\Foundation\Testing\TestCase
{
    use CreatesSachaContext;
    use RefreshDatabase;
}
