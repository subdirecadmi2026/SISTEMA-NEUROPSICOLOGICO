<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->allow($request, 'users.manage');

        return response()->json(
            User::query()
                ->with(['roles', 'branches', 'currentBranch'])
                ->where('company_id', $this->companyId($request))
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->allow($request, 'users.manage');
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'phone' => ['nullable', 'string'],
            'role' => ['required', 'string'],
            'branch_ids' => ['required', 'array', 'min:1'],
            'branch_ids.*' => ['string', 'exists:branches,id'],
        ]);

        $user = User::query()->create([
            'company_id' => $this->companyId($request),
            'current_branch_id' => $data['branch_ids'][0],
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => Hash::make($data['password']),
            'is_active' => true,
        ]);
        $user->assignRole($data['role']);
        $sync = [];
        foreach ($data['branch_ids'] as $i => $id) {
            $sync[$id] = ['is_default' => $i === 0];
        }
        $user->branches()->sync($sync);

        return response()->json($user->load(['roles', 'branches']), 201);
    }

    public function roles(Request $request): JsonResponse
    {
        $this->allow($request, 'users.manage');

        return response()->json(Role::query()->with('permissions')->orderBy('name')->get());
    }
}
