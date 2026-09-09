<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $this->allow($request, 'settings.view');
        $company = Company::query()->findOrFail($this->companyId($request));

        return response()->json([
            'company' => $company,
            'sri_simulator' => true,
            'sri_notice' => 'La facturación electrónica usa un simulador de ambiente de pruebas. No envía XML real al SRI.',
            'integrations' => [
                'uber_eats' => 'stub',
                'rappi' => 'stub',
                'payments_gateway' => 'stub',
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->allow($request, 'settings.manage');
        $data = $request->validate([
            'sri_contingency' => ['sometimes', 'boolean'],
            'trade_name' => ['sometimes', 'string'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
        ]);
        $company = Company::query()->findOrFail($this->companyId($request));
        $settings = $company->settings ?? [];
        if (array_key_exists('sri_contingency', $data)) {
            $settings['sri_contingency'] = (bool) $data['sri_contingency'];
            unset($data['sri_contingency']);
        }
        $company->fill($data);
        $company->settings = $settings;
        $company->save();

        return response()->json($company->fresh());
    }
}
