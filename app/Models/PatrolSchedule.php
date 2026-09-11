<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PatrolSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'site_id',
        'shift_name',
        'start_time',
        'end_time',
        'schedule_date',
        'min_patrol_rounds',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'schedule_date' => 'date',
            'min_patrol_rounds' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'patrol_schedule_users');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(PatrolSession::class);
    }
}
