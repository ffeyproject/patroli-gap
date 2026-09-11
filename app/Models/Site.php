<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Site extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'address',
        'latitude',
        'longitude',
        'geofence_radius_meters',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'geofence_radius_meters' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function checkpoints(): HasMany
    {
        return $this->hasMany(Checkpoint::class)->orderBy('order_index');
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(PatrolSchedule::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(PatrolSession::class);
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }

    public function visitors(): HasMany
    {
        return $this->hasMany(Visitor::class);
    }

    /**
     * Calculate distance in meters from this site to given GPS coordinates using Haversine formula.
     */
    public function distanceTo(float $lat, float $lng): float
    {
        if ($this->latitude === null || $this->longitude === null) {
            return 0.0;
        }

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
     * Check if given GPS coordinates are within site geofence radius.
     */
    public function isWithinRadius(float $lat, float $lng, ?float $customMaxRadius = null): bool
    {
        $maxRadius = $customMaxRadius ?? ($this->geofence_radius_meters ?: 100.0);
        return $this->distanceTo($lat, $lng) <= $maxRadius;
    }
}
