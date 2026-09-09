<?php

namespace App\Domain\Audit;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class AuditLogger
{
    public function record(
        string $action,
        ?Model $auditable = null,
        ?User $user = null,
        ?array $old = null,
        ?array $new = null,
        ?string $ip = null,
        ?string $userAgent = null,
    ): AuditLog {
        return AuditLog::query()->create([
            'company_id' => $user?->company_id ?? (app()->bound('currentCompanyId') ? app('currentCompanyId') : null),
            'user_id' => $user?->id,
            'action' => $action,
            'auditable_type' => $auditable?->getMorphClass(),
            'auditable_id' => $auditable?->getKey(),
            'old_values' => $old,
            'new_values' => $new,
            'ip_address' => $ip,
            'user_agent' => $userAgent ? substr($userAgent, 0, 512) : null,
            'created_at' => now(),
        ]);
    }
}
