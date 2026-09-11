<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class WatermarkService
{
    /**
     * Resolve font path for TTF rendering.
     */
    protected function getFontPath(bool $bold = false): ?string
    {
        $customBold = base_path('resources/fonts/Arial-Bold.ttf');
        $customRegular = base_path('resources/fonts/Arial-Regular.ttf');

        if ($bold && file_exists($customBold)) {
            return $customBold;
        }
        if (file_exists($customRegular)) {
            return $customRegular;
        }

        // Windows fallback
        $winBold = 'C:/Windows/Fonts/arialbd.ttf';
        $winRegular = 'C:/Windows/Fonts/arial.ttf';
        if ($bold && file_exists($winBold)) {
            return $winBold;
        }
        if (file_exists($winRegular)) {
            return $winRegular;
        }

        // Linux fallback
        $linuxFonts = [
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
        ];
        foreach ($linuxFonts as $f) {
            if (file_exists($f)) {
                return $f;
            }
        }

        return null;
    }

    /**
     * Watermark an uploaded image with guard name, checkpoint, coordinates, date/time and distance.
     *
     * @param string|\Illuminate\Http\UploadedFile $imageSource Base64 string or UploadedFile
     * @param array $metadata [userName, userRole, checkpointName, siteName, latitude, longitude, distanceMeters, scannedAt]
     * @param string $folder Storage folder
     * @return string Relative storage path of saved watermarked image
     */
    public function watermarkAndSave($imageSource, array $metadata, string $folder = 'patrol_selfies'): string
    {
        // 1. Load image resource
        $img = null;
        if (is_string($imageSource) && str_starts_with($imageSource, 'data:image')) {
            $data = explode(',', $imageSource);
            $raw = base64_decode(end($data));
            $img = @imagecreatefromstring($raw);
        } elseif (is_string($imageSource) && file_exists($imageSource)) {
            $raw = @file_get_contents($imageSource);
            $img = $raw ? @imagecreatefromstring($raw) : null;
        } elseif (is_object($imageSource) && method_exists($imageSource, 'getRealPath')) {
            $raw = @file_get_contents($imageSource->getRealPath());
            $img = $raw ? @imagecreatefromstring($raw) : null;
        }

        if (!$img) {
            // Fallback placeholder canvas
            $img = imagecreatetruecolor(1080, 1440);
            $bg = imagecolorallocate($img, 15, 23, 42);
            imagefilledrectangle($img, 0, 0, 1080, 1440, $bg);
        }

        // 2. Normalize and scale image if oversized (e.g. > 1440px wide) for fast processing and optimal mobile storage
        $origWidth = imagesx($img);
        $origHeight = imagesy($img);
        $maxAllowedWidth = 1440;

        if ($origWidth > $maxAllowedWidth) {
            $newWidth = $maxAllowedWidth;
            $newHeight = (int)($origHeight * ($maxAllowedWidth / $origWidth));
            $scaledImg = imagecreatetruecolor($newWidth, $newHeight);
            imagealphablending($scaledImg, true);
            imagesavealpha($scaledImg, true);
            imagecopyresampled($scaledImg, $img, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);
            imagedestroy($img);
            $img = $scaledImg;
        }

        $width = imagesx($img);
        $height = imagesy($img);

        // Ensure alpha blending
        imagealphablending($img, true);
        imagesavealpha($img, true);

        // 3. Resolve metadata text
        $userName = $metadata['userName'] ?? 'Petugas';
        $userRole = strtoupper($metadata['userRole'] ?? 'SATPAM');
        $siteName = $metadata['siteName'] ?? 'PT. Gajah Angkasa Perkasa';
        $checkpointName = $metadata['checkpointName'] ?? 'Titik Patroli';
        $lat = number_format((float)($metadata['latitude'] ?? 0), 6);
        $lng = number_format((float)($metadata['longitude'] ?? 0), 6);
        $dist = number_format((float)($metadata['distanceMeters'] ?? 0), 1);
        $maxRad = isset($metadata['maxRadiusMeters']) ? number_format((float)$metadata['maxRadiusMeters'], 0) : '10';
        $time = $metadata['scannedAt'] ?? now()->timezone('Asia/Jakarta')->translatedFormat('d M Y, H:i:s') . ' WIB';

        $headerTitle = "PATROLI SECURITY • PT. GAJAH ANGKASA PERKASA";
        $line1 = "PETUGAS: {$userName} [{$userRole}]  |  SITE: {$siteName}";
        $line2 = "TITIK: {$checkpointName}  (Radius Valid: {$dist}m <= {$maxRad}m)";
        $line3 = "WAKTU: {$time}  |  GPS: {$lat}, {$lng}";

        // 4. Calculate dynamic font size and banner dimensions
        $fontBold = $this->getFontPath(true);
        $fontRegular = $this->getFontPath(false);
        $useTtf = ($fontBold !== null && function_exists('imagettftext'));

        // Proportional font sizing: ~2.3% of image width (gives ~25px on 1080w, ~17px on 720w)
        $fontSize = max(14, (int)($width * 0.023));
        $headerFontSize = max(12, (int)($fontSize * 0.88));
        $lineHeight = (int)($fontSize * 1.65);

        $paddingX = max(16, (int)($width * 0.035));
        $paddingY = max(14, (int)($fontSize * 0.9));
        $bannerHeight = ($paddingY * 2) + ($lineHeight * 4);
        
        // Place watermark banner at the TOP of the image (di bagian atas foto)
        $bannerY = 0;

        // 5. Draw modern semi-transparent dark overlay banner at the top
        $overlayColor = imagecolorallocatealpha($img, 8, 14, 28, 12); // Deep navy overlay
        imagefilledrectangle($img, 0, 0, $width, $bannerHeight, $overlayColor);

        // Bottom accent line for top banner (Cyan bar)
        $accentColor = imagecolorallocate($img, 14, 165, 233); // Vibrant Sky Blue
        $accentHeight = max(3, (int)($height * 0.005));
        imagefilledrectangle($img, 0, $bannerHeight - $accentHeight, $width, $bannerHeight, $accentColor);

        // 6. Colors
        $colorBlack = imagecolorallocate($img, 0, 0, 0);
        $colorHeader = imagecolorallocate($img, 56, 189, 248);  // Cyan Sky
        $colorYellow = imagecolorallocate($img, 253, 224, 71);  // Gold / Amber
        $colorGreen = imagecolorallocate($img, 74, 222, 128);   // Emerald Green
        $colorCyan = imagecolorallocate($img, 224, 242, 254);    // Ice White / Cyan

        // 7. Render Text (TTF or Fallback)
        if ($useTtf) {
            $shadowOffset = max(1, (int)($fontSize * 0.08));

            // Helper to render text with shadow
            $drawText = function (string $text, int $yPos, $color, int $size, string $font) use ($img, $paddingX, $shadowOffset, $colorBlack) {
                // Drop shadow
                @imagettftext($img, $size, 0, $paddingX + $shadowOffset, $yPos + $shadowOffset, $colorBlack, $font, $text);
                // Main text
                @imagettftext($img, $size, 0, $paddingX, $yPos, $color, $font, $text);
            };

            $currentY = $bannerY + $paddingY + $fontSize;

            // Header Line
            $drawText($headerTitle, $currentY, $colorHeader, $headerFontSize, $fontBold);
            $currentY += $lineHeight;

            // Line 1: Petugas & Site
            $drawText($line1, $currentY, $colorYellow, $fontSize, $fontBold);
            $currentY += $lineHeight;

            // Line 2: Titik & Radius
            $drawText($line2, $currentY, $colorGreen, $fontSize, $fontBold);
            $currentY += $lineHeight;

            // Line 3: Waktu & GPS
            $drawText($line3, $currentY, $colorCyan, $fontSize, $fontRegular ?: $fontBold);
        } else {
            // Built-in GD font fallback
            $fontIdx = 5;
            $currentY = $bannerY + 12;

            imagestring($img, $fontIdx, $paddingX + 1, $currentY + 1, $headerTitle, $colorBlack);
            imagestring($img, $fontIdx, $paddingX, $currentY, $headerTitle, $colorHeader);
            $currentY += 24;

            imagestring($img, $fontIdx, $paddingX + 1, $currentY + 1, $line1, $colorBlack);
            imagestring($img, $fontIdx, $paddingX, $currentY, $line1, $colorYellow);
            $currentY += 24;

            imagestring($img, $fontIdx, $paddingX + 1, $currentY + 1, $line2, $colorBlack);
            imagestring($img, $fontIdx, $paddingX, $currentY, $line2, $colorGreen);
            $currentY += 24;

            imagestring($img, $fontIdx, $paddingX + 1, $currentY + 1, $line3, $colorBlack);
            imagestring($img, $fontIdx, $paddingX, $currentY, $line3, $colorCyan);
        }

        // 8. Save to public storage with high JPEG quality
        $filename = 'selfie_' . date('Ymd_His') . '_' . Str::random(8) . '.jpg';
        $storageDir = storage_path('app/public/' . $folder);
        if (!file_exists($storageDir)) {
            mkdir($storageDir, 0755, true);
        }

        $fullPath = $storageDir . '/' . $filename;
        imagejpeg($img, $fullPath, 90);
        imagedestroy($img);

        return 'storage/' . $folder . '/' . $filename;
    }
}
