<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['application' => 'Mission MRCEM API', 'status' => 'ok']);
});
