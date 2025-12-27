<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['message' => 'Housarr API'];
});

// Health check endpoint for container orchestration
Route::get('/up', function () {
    return response('OK', 200);
});
