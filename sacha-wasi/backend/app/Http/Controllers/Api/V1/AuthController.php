<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LoginAttempt;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:80'],
        ]);

        $user = User::query()->where('email', $credentials['email'])->first();
        $device = $credentials['device_name'] ?? $request->userAgent() ?? 'api';

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            $this->recordAttempt($request, $user, false, 'invalid_credentials');

            if ($user) {
                $user->increment('failed_login_count');
            }

            throw ValidationException::withMessages([
                'email' => ['Las credenciales no coinciden con nuestros registros.'],
            ]);
        }

        if (! $user->is_active) {
            $this->recordAttempt($request, $user, false, 'inactive');

            throw ValidationException::withMessages([
                'email' => ['Esta cuenta está desactivada.'],
            ]);
        }

        $user->forceFill([
            'failed_login_count' => 0,
            'last_login_at' => now(),
        ])->save();

        $this->recordAttempt($request, $user, true, null);

        $token = $user->createToken($device)->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->payload($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->payload($request->user()));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Sesión cerrada.']);
    }

    public function switchBranch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'branch_id' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (! $user->canAccessBranch($data['branch_id'])) {
            abort(403, 'No tiene acceso a esta sucursal.');
        }

        $user->current_branch_id = $data['branch_id'];
        $user->save();

        return response()->json($this->payload($user->fresh()));
    }

    private function payload(User $user): array
    {
        $user->load(['company', 'currentBranch', 'branches', 'roles']);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'company' => $user->company,
            'current_branch' => $user->currentBranch,
            'branches' => $user->branches,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ];
    }

    private function recordAttempt(Request $request, ?User $user, bool $successful, ?string $reason): void
    {
        LoginAttempt::query()->create([
            'user_id' => $user?->id,
            'email' => $request->input('email', $user?->email),
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 512),
            'successful' => $successful,
            'reason' => $reason,
            'attempted_at' => now(),
        ]);
    }
}
