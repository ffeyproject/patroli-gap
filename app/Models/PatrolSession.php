<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PatrolSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'patrol_schedule_id',
        'site_id',
        'user_id',
        'round_number',
        'started_at',
        'completed_at',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'round_number' => 'integer',
        ];
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(PatrolSchedule::class, 'patrol_schedule_id');
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(PatrolLog::class);
    }
}
