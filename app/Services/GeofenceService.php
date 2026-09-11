<?php

namespace App\Services;

class GeofenceService
{
    /**
     * Calculate distance between two coordinates in meters using Haversine formula.
     */
    public function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // meters

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round($earthRadius * $c, 2);
    }

    /**
     * Check if coordinates are within the maximum allowed radius in meters (default 10m).
     */
    public function isWithinRadius(float $lat1, float $lon1, float $lat2, float $lon2, float $maxRadiusMeters = 10.0): bool
    {
        $distance = $this->calculateDistance($lat1, $lon1, $lat2, $lon2);
        return $distance <= $maxRadiusMeters;
    }
}
