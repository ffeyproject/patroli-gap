<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Checkpoint extends Model
{
    use HasFactory;

    protected $fillable = [
        'site_id',
        'name',
        'code',
        'qr_token',
        'location_description',
        'latitude',
        'longitude',
        'max_radius_meters',
        'order_index',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'max_radius_meters' => 'integer',
            'order_index' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($checkpoint) {
            if (empty($checkpoint->qr_token)) {
                $checkpoint->qr_token = 'CP-' . strtoupper(Str::random(12));
            }
        });
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(PatrolLog::class);
    }

    /**
     * Calculate distance in meters from this checkpoint to given GPS coordinates using Haversine formula.
     */
    public function distanceTo(float $lat, float $lng): float
    {
        $earthRadius = 6371000; // meters
        $dLat = deg2rad($this->latitude - $lat);
        $dLon = deg2rad($this->longitude - $lng);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat)) * cos(deg2rad($this->latitude)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round($earthRadius * $c, 2);
    }

    /**
     * Check if given GPS coordinates are strictly within checkpoint's max tolerance radius.
     * Menggunakan radius toleransi yang diatur pada checkpoint ($this->max_radius_meters).
     */
    public function isWithinRadius(float $lat, float $lng, ?float $customMaxRadius = null): bool
    {
        $maxRadius = $customMaxRadius ?? (float)($this->max_radius_meters ?? 10.0);
        return $this->distanceTo($lat, $lng) <= $maxRadius;
    }
}
