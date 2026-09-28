<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\LearningController;
use App\Http\Controllers\ResultBrowserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->middleware('throttle:auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
    Route::post('forgot-password', [AuthController::class, 'forgot']);
    Route::post('reset-password', [AuthController::class, 'reset']);
});
Route::get('courses', [LearningController::class, 'courses']);
Route::get('courses/{slug}', [LearningController::class, 'course']);
Route::get('settings', [LearningController::class, 'settings']);
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::get('auth/user', fn (Request $r) => response()->json($r->user()));
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::put('auth/profile', [AuthController::class, 'profile']);
    Route::put('auth/password', [AuthController::class, 'changePassword'])->middleware('throttle:auth');
    Route::get('dashboard', [LearningController::class, 'dashboard']);
    Route::get('my-courses', [LearningController::class, 'myCourses']);
    Route::post('courses/{course}/enroll', [LearningController::class, 'enroll']);
    Route::post('courses/{course}/payments', [LearningController::class, 'payment']);
    Route::get('my-payments', [LearningController::class, 'payments']);
    Route::get('my-attempts', [LearningController::class, 'history']);
    Route::get('exams/{exam}', [LearningController::class, 'exam']);
    Route::post('exams/{exam}/start', [LearningController::class, 'start']);
    Route::get('exam-attempts/{attempt}', [LearningController::class, 'attempt']);
    Route::put('exam-attempts/{attempt}/answer', [LearningController::class, 'answer']);
    Route::post('exam-attempts/{attempt}/submit', [LearningController::class, 'submit']);
    Route::get('exam-attempts/{attempt}/result', [LearningController::class, 'result']);

    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('dashboard', [AdminController::class, 'dashboard']);
        Route::get('courses', [AdminController::class, 'courses']);
        Route::post('courses', [AdminController::class, 'saveCourse']);
        Route::put('courses/{course}', [AdminController::class, 'saveCourse']);
        Route::delete('courses/{course}', [AdminController::class, 'deleteCourse']);
        Route::get('subjects', [AdminController::class, 'subjects']);
        Route::post('subjects', [AdminController::class, 'saveSubject']);
        Route::put('subjects/{subject}', [AdminController::class, 'saveSubject']);
        Route::delete('subjects/{subject}', [AdminController::class, 'deleteSubject']);
        Route::get('questions', [AdminController::class, 'questions']);
        Route::post('questions', [AdminController::class, 'saveQuestion']);
        Route::put('questions/{question}', [AdminController::class, 'saveQuestion']);
        Route::delete('questions/{question}', [AdminController::class, 'deleteQuestion']);
        Route::get('question-import/template', [ImportController::class, 'template']);
        Route::post('question-import/preview', [ImportController::class, 'preview']);
        Route::post('question-import/{import}/confirm', [ImportController::class, 'confirm']);
        Route::get('exams', [AdminController::class, 'exams']);
        Route::get('exams/{exam}', [AdminController::class, 'exam']);
        Route::post('exams', [AdminController::class, 'saveExam']);
        Route::put('exams/{exam}', [AdminController::class, 'saveExam']);
        Route::delete('exams/{exam}', [AdminController::class, 'deleteExam']);
        Route::get('users', [AdminController::class, 'users']);
        Route::get('users/{user}', [AdminController::class, 'user']);
        Route::put('users/{user}', [AdminController::class, 'updateUser']);
        Route::get('enrollments', [AdminController::class, 'enrollments']);
        Route::put('enrollments/{enrollment}', [AdminController::class, 'updateEnrollment']);
        Route::get('payments', [AdminController::class, 'payments']);
        Route::put('payments/{payment}', [AdminController::class, 'verifyPayment']);
        Route::get('filter-options', [ResultBrowserController::class, 'options']);
        Route::get('result-courses', [ResultBrowserController::class, 'courses']);
        Route::get('result-exams', [ResultBrowserController::class, 'exams']);
        Route::get('results', [ResultBrowserController::class, 'results']);
        Route::get('results/{attempt}', [AdminController::class, 'result']);
        Route::put('results/{attempt}/grade/{question}', [AdminController::class, 'grade']);
        Route::put('settings', [AdminController::class, 'settings']);
    });
});
