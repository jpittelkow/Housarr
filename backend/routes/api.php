<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\HouseholdController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\MaintenanceLogController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PartController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ReminderController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\TodoController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VendorController;
use Illuminate\Support\Facades\Route;

// Public routes with stricter rate limiting
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
});

// Protected routes with standard rate limiting
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::post('/auth/invite', [AuthController::class, 'invite']);

    // Profile (self-service)
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::patch('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'updatePassword']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/dashboard/prefetch', [DashboardController::class, 'prefetch']);

    // Household
    Route::get('/household', [HouseholdController::class, 'show']);
    Route::patch('/household', [HouseholdController::class, 'update']);

    // Users
    Route::get('/users', [UserController::class, 'index']);
    Route::patch('/users/{user}', [UserController::class, 'update']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);

    // Categories
    Route::apiResource('categories', CategoryController::class);

    // Locations
    Route::apiResource('locations', LocationController::class);

    // Vendors
    Route::apiResource('vendors', VendorController::class);

    // Items
    Route::post('/items/analyze-image', [ItemController::class, 'analyzeImage']);
    Route::apiResource('items', ItemController::class);
    Route::post('/items/{item}/manual', [ItemController::class, 'uploadManual']);
    Route::post('/items/{item}/download-manual', [ItemController::class, 'downloadManual']);
    Route::post('/items/{item}/search-manual-urls', [ItemController::class, 'searchManualUrls']);
    Route::post('/items/{item}/download-manual-url', [ItemController::class, 'downloadManualFromUrl']);
    Route::post('/items/{item}/ai-suggestions', [ItemController::class, 'getAISuggestions']);
    Route::get('/items/{item}/ai-config', [ItemController::class, 'checkAIConfig']);
    Route::post('/items/{item}/ai-query', [ItemController::class, 'queryAISuggestions']);
    Route::post('/items/{item}/suggest-parts', [ItemController::class, 'suggestParts']);

    // Parts
    Route::get('/items/{item}/parts', [PartController::class, 'index']);
    Route::post('/parts', [PartController::class, 'store']);
    Route::post('/parts/batch', [PartController::class, 'storeBatch']);
    Route::patch('/parts/{part}', [PartController::class, 'update']);
    Route::delete('/parts/{part}', [PartController::class, 'destroy']);

    // Maintenance Logs
    Route::get('/items/{item}/logs', [MaintenanceLogController::class, 'index']);
    Route::post('/maintenance-logs', [MaintenanceLogController::class, 'store']);
    Route::patch('/maintenance-logs/{maintenanceLog}', [MaintenanceLogController::class, 'update']);
    Route::delete('/maintenance-logs/{maintenanceLog}', [MaintenanceLogController::class, 'destroy']);

    // Reminders
    Route::apiResource('reminders', ReminderController::class);
    Route::post('/reminders/{reminder}/snooze', [ReminderController::class, 'snooze']);
    Route::post('/reminders/{reminder}/complete', [ReminderController::class, 'complete']);

    // Todos
    Route::apiResource('todos', TodoController::class);
    Route::post('/todos/{todo}/complete', [TodoController::class, 'complete']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/mark-read', [NotificationController::class, 'markRead']);

    // Settings
    Route::get('/settings', [SettingController::class, 'index']);
    Route::patch('/settings', [SettingController::class, 'update']);
    Route::get('/settings/storage', [SettingController::class, 'checkStorage']);
    Route::get('/settings/email', [SettingController::class, 'checkEmail']);
    Route::get('/settings/ai', [SettingController::class, 'checkAI']);
    Route::post('/settings/ai/test', [SettingController::class, 'testAI']);

    // Files (with stricter rate limiting for uploads)
    Route::middleware('throttle:30,1')->group(function () {
        Route::post('/files', [FileController::class, 'store']);
    });
    Route::post('/files/{file}/featured', [FileController::class, 'setFeatured']);
    Route::delete('/files/{file}', [FileController::class, 'destroy']);

    // Backup/Restore (admin only, rate limited)
    Route::middleware('throttle:5,1')->group(function () {
        Route::get('/backup/export', [BackupController::class, 'export']);
        Route::post('/backup/import', [BackupController::class, 'import']);
    });
});
