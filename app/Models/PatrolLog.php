<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatrolLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'patrol_session_id',
        'checkpoint_id',
        'user_id',
        'scanned_at',
        'selfie_photo_path',
        'latitude',
        'longitude',
        'distance_meters',
        'is_valid_location',
        'condition_status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'scanned_at' => 'datetime',
            'latitude' => 'float',
            'longitude' => 'float',
            'distance_meters' => 'float',
            'is_valid_location' => 'boolean',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(PatrolSession::class, 'patrol_session_id');
    }

    public function checkpoint(): BelongsTo
    {
        return $this->belongsTo(Checkpoint::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
