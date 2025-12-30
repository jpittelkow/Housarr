<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Http\Requests\Api\RegisterRequest;
use App\Http\Requests\Api\InviteUserRequest;
use App\Http\Resources\UserResource;
use App\Models\Household;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = DB::transaction(function () use ($validated) {
            $household = Household::create([
                'name' => $validated['household_name'],
            ]);

            $user = User::create([
                'household_id' => $household->id,
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => 'admin',
            ]);

            return $user;
        });

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'user' => new UserResource($user->load('household')),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        // #region agent log
        $loginStart = microtime(true);
        $logPath = storage_path('logs/debug.log');
        file_put_contents($logPath, json_encode(['location'=>'AuthController:login','message'=>'login started','data'=>[],'timestamp'=>round(microtime(true)*1000),'sessionId'=>'debug-session','hypothesisId'=>'E'])."\n", FILE_APPEND);
        // #endregion

        $validated = $request->validated();
        $key = 'login:' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => "Too many login attempts. Please try again in {$seconds} seconds.",
            ], 429);
        }

        // #region agent log
        $authAttemptStart = microtime(true);
        // #endregion
        if (!Auth::attempt($validated)) {
            RateLimiter::hit($key, 60);
            return response()->json([
                'message' => 'Invalid credentials',
            ], 401);
        }
        // #region agent log
        file_put_contents($logPath, json_encode(['location'=>'AuthController:login','message'=>'Auth::attempt completed','data'=>['durationMs'=>round((microtime(true)-$authAttemptStart)*1000)],'timestamp'=>round(microtime(true)*1000),'sessionId'=>'debug-session','hypothesisId'=>'E'])."\n", FILE_APPEND);
        // #endregion

        RateLimiter::clear($key);
        // #region agent log
        $sessionStart = microtime(true);
        // #endregion
        $request->session()->regenerate();
        // #region agent log
        file_put_contents($logPath, json_encode(['location'=>'AuthController:login','message'=>'session regenerate completed','data'=>['durationMs'=>round((microtime(true)-$sessionStart)*1000)],'timestamp'=>round(microtime(true)*1000),'sessionId'=>'debug-session','hypothesisId'=>'E'])."\n", FILE_APPEND);
        // #endregion
        $user = $request->user();

        // #region agent log
        file_put_contents($logPath, json_encode(['location'=>'AuthController:login','message'=>'login completed','data'=>['totalDurationMs'=>round((microtime(true)-$loginStart)*1000)],'timestamp'=>round(microtime(true)*1000),'sessionId'=>'debug-session','hypothesisId'=>'E'])."\n", FILE_APPEND);
        // #endregion
        return response()->json([
            'user' => new UserResource($user->load('household')),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        // #region agent log
        $userStart = microtime(true);
        $logPath = storage_path('logs/debug.log');
        file_put_contents($logPath, json_encode(['location'=>'AuthController:user','message'=>'user endpoint started','data'=>[],'timestamp'=>round(microtime(true)*1000),'sessionId'=>'debug-session','hypothesisId'=>'C'])."\n", FILE_APPEND);
        // #endregion
        $user = $request->user()->load('household');
        // #region agent log
        file_put_contents($logPath, json_encode(['location'=>'AuthController:user','message'=>'user endpoint completed','data'=>['durationMs'=>round((microtime(true)-$userStart)*1000)],'timestamp'=>round(microtime(true)*1000),'sessionId'=>'debug-session','hypothesisId'=>'C'])."\n", FILE_APPEND);
        // #endregion
        return response()->json([
            'user' => new UserResource($user),
        ]);
    }

    public function invite(InviteUserRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'household_id' => $request->user()->household_id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'] ?? 'member',
        ]);

        return response()->json([
            'user' => new UserResource($user),
            'message' => 'User invited successfully',
        ], 201);
    }
}
