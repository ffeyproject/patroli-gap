<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'login' => 'required|string', // can be email, username, or badge_number
            'password' => 'required|string',
            'device_name' => 'nullable|string',
        ]);

        $throttleKey = 'api_login:' . Str::transliterate(Str::lower($request->input('login')) . '|' . $request->ip());

        // 1. Check Rate Limiter (Max 5 failed attempts per minute)
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return response()->json([
                'success' => false,
                'message' => "Terlalu banyak percobaan login gagal. Akun/IP dibatasi sementara, silakan coba lagi dalam {$seconds} detik.",
                'retry_after_seconds' => $seconds,
            ], 429);
        }

        $user = User::where('email', $request->login)
            ->orWhere('username', $request->login)
            ->orWhere('badge_number', $request->login)
            ->first();

        // 2. Validate Password
        if (!$user || !Hash::check($request->password, $user->password)) {
            RateLimiter::hit($throttleKey, 60); // 60 seconds decay
            $remaining = RateLimiter::remaining($throttleKey, 5);

            return response()->json([
                'success' => false,
                'message' => "Kredensial login tidak valid. Sisa percobaan: {$remaining} kali sebelum terkunci sementara.",
                'remaining_attempts' => $remaining,
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda sedang dinonaktifkan. Hubungi administrator.',
            ], 403);
        }

        // 3. Clear Rate Limiter on Successful Login
        RateLimiter::clear($throttleKey);

        // Generate Sanctum token
        $deviceName = $request->device_name ?? 'Flutter Mobile';
        $token = $user->createToken($deviceName)->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil.',
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'badge_number' => $user->badge_number,
                    'phone' => $user->phone,
                    'role' => $user->role,
                    'avatar' => $user->avatar,
                ],
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.',
        ]);
    }

    public function profile(Request $request): JsonResponse
    {
        $user = $request->user();

        // Get today's attendance
        $todayAttendance = $user->attendances()
            ->whereDate('check_in_at', today())
            ->latest('check_in_at')
            ->first();

        // Get today's assigned schedules
        $schedules = $user->schedules()
            ->with('site')
            ->where('is_active', true)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'user' => $user,
                'attendance_today' => $todayAttendance,
                'schedules_today' => $schedules,
            ],
        ]);
    }
}
