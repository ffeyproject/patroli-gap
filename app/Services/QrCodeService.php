<?php

namespace App\Services;

class QrCodeService
{
    /**
     * Generate QR Code Image URL for a given token.
     * Uses standardized high-performance SVG API or data representation.
     */
    public function getQrImageUrl(string $token, int $size = 250): string
    {
        return 'https://api.qrserver.com/v1/create-qr-code/?size=' . $size . 'x' . $size . '&data=' . urlencode($token);
    }
}
