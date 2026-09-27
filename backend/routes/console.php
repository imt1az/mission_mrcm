<?php

use App\Models\ExamAttempt;
use App\Models\User;
use App\Services\ExamService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

Artisan::command('exams:expire', function () {
    $count = 0;
    ExamAttempt::where('status', 'in_progress')->where('expires_at', '<=', now())->chunkById(100, function ($attempts) use (&$count) {
        foreach ($attempts as $attempt) {
            app(ExamService::class)->finish($attempt);
            $count++;
        }
    });
    $this->info("Finalized {$count} expired attempts.");
})->purpose('Finalize attempts at their server-side deadline');
Schedule::command('exams:expire')->everyMinute()->withoutOverlapping();
Schedule::call(fn () => DB::table('question_imports')->where('expires_at', '<', now()->subDay())->delete())->daily();

Artisan::command('app:create-admin {email} {--name=Administrator}', function () {
    $email = strtolower($this->argument('email'));
    if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $this->error('Enter a valid email address.');

        return 1;
    }
    if (User::where('email', $email)->exists()) {
        $this->error('An account already exists with this email.');

        return 1;
    }
    $password = $this->secret('Password (at least 12 characters, including letters and numbers)');
    $validator = Validator::make(['password' => $password], ['password' => ['required', Password::min(12)->letters()->numbers()]]);
    if ($validator->fails()) {
        $this->error($validator->errors()->first());

        return 1;
    }
    if ($this->secret('Confirm password') !== $password) {
        $this->error('Passwords do not match.');

        return 1;
    }
    User::create(['email' => $email, 'name' => $this->option('name'), 'password' => $password, 'role' => 'admin', 'status' => 'active']);
    $this->info('Administrator created.');

    return 0;
})->purpose('Create a production administrator without demo credentials');
