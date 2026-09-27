<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->string('role')->default('doctor')->index();
            $t->string('status')->default('active')->index();
        });
        Schema::create('subjects', function (Blueprint $t) {
            $t->id();
            $t->string('name')->unique();
            $t->string('slug')->unique();
            $t->string('status')->default('active');
            $t->timestamps();
        });
        Schema::create('courses', function (Blueprint $t) {
            $t->id();
            $t->string('title');
            $t->string('slug')->unique();
            $t->string('short_description', 500);
            $t->text('description');
            $t->string('course_type')->default('free');
            $t->decimal('price', 12, 2)->default(0);
            $t->string('status')->default('draft')->index();
            $t->timestamps();
            $t->softDeletes();
        });
        Schema::create('course_enrollments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->foreignId('course_id')->constrained()->restrictOnDelete();
            $t->string('status')->default('pending')->index();
            $t->timestamp('enrolled_at')->nullable();
            $t->timestamp('expires_at')->nullable();
            $t->timestamps();
            $t->unique(['user_id', 'course_id']);
        });
        Schema::create('exams', function (Blueprint $t) {
            $t->id();
            $t->foreignId('course_id')->constrained()->restrictOnDelete();
            $t->string('title');
            $t->text('description')->nullable();
            $t->unsignedInteger('duration_minutes')->default(30);
            $t->decimal('total_marks', 10, 2)->default(0);
            $t->decimal('pass_mark', 10, 2)->default(0);
            $t->boolean('negative_marking')->default(false);
            $t->decimal('negative_mark_value', 8, 2)->default(0);
            $t->unsignedInteger('attempt_limit')->default(3);
            $t->boolean('shuffle_questions')->default(false);
            $t->boolean('shuffle_options')->default(false);
            $t->boolean('show_result')->default(true);
            $t->boolean('show_correct_answers')->default(true);
            $t->string('status')->default('draft')->index();
            $t->timestamps();
            $t->softDeletes();
        });
        Schema::create('questions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('subject_id')->nullable()->constrained()->nullOnDelete();
            $t->string('question_type')->default('single_choice');
            $t->text('question_text');
            $t->text('explanation')->nullable();
            $t->string('status')->default('draft')->index();
            $t->timestamps();
            $t->softDeletes();
        });
        Schema::create('question_options', function (Blueprint $t) {
            $t->id();
            $t->foreignId('question_id')->constrained()->cascadeOnDelete();
            $t->text('option_text');
            $t->unsignedInteger('sort_order');
            $t->boolean('is_correct')->default(false);
            $t->timestamps();
            $t->unique(['question_id', 'sort_order']);
        });
        Schema::create('exam_questions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('exam_id')->constrained()->restrictOnDelete();
            $t->foreignId('question_id')->constrained()->restrictOnDelete();
            $t->decimal('marks', 8, 2)->default(1);
            $t->unsignedInteger('sort_order');
            $t->timestamps();
            $t->unique(['exam_id', 'question_id']);
        });
        Schema::create('exam_attempts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->foreignId('exam_id')->constrained()->restrictOnDelete();
            $t->timestamp('started_at');
            $t->timestamp('expires_at')->index();
            $t->timestamp('submitted_at')->nullable();
            $t->string('status')->default('in_progress');
            $t->json('snapshot');
            $t->decimal('score', 12, 2)->nullable();
            $t->decimal('total_marks', 12, 2);
            $t->unsignedInteger('correct_count')->default(0);
            $t->unsignedInteger('wrong_count')->default(0);
            $t->unsignedInteger('unanswered_count')->default(0);
            $t->unsignedInteger('pending_count')->default(0);
            $t->unsignedInteger('total_questions');
            $t->timestamps();
            $t->index(['user_id', 'exam_id', 'status']);
        });
        Schema::create('attempt_answers', function (Blueprint $t) {
            $t->id();
            $t->foreignId('exam_attempt_id')->constrained()->restrictOnDelete();
            // IDs identify immutable snapshot entries; they deliberately do not reference mutable options.
            $t->unsignedBigInteger('question_id');
            $t->unsignedBigInteger('selected_option_id')->nullable();
            $t->text('text_answer')->nullable();
            $t->boolean('is_correct')->nullable();
            $t->string('grading_status')->default('pending');
            $t->decimal('marks_awarded', 10, 2)->nullable();
            $t->text('feedback')->nullable();
            $t->foreignId('graded_by')->nullable()->constrained('users')->restrictOnDelete();
            $t->timestamp('graded_at')->nullable();
            $t->timestamp('answered_at')->nullable();
            $t->timestamps();
            $t->unique(['exam_attempt_id', 'question_id']);
        });
        Schema::create('payments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->foreignId('course_id')->constrained()->restrictOnDelete();
            $t->decimal('amount', 12, 2);
            $t->string('payment_method');
            $t->string('transaction_reference')->unique();
            $t->string('status')->default('pending')->index();
            $t->timestamp('paid_at');
            $t->timestamp('verified_at')->nullable();
            $t->foreignId('verified_by')->nullable()->constrained('users')->restrictOnDelete();
            $t->text('review_note')->nullable();
            $t->timestamps();
        });
        Schema::create('question_imports', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->json('payload');
            $t->timestamp('expires_at');
            $t->timestamp('confirmed_at')->nullable();
            $t->timestamps();
        });
        Schema::create('settings', function (Blueprint $t) {
            $t->string('key')->primary();
            $t->text('value')->nullable();
        });
    }

    public function down(): void
    {
        foreach (['settings', 'question_imports', 'payments', 'attempt_answers', 'exam_attempts', 'exam_questions', 'question_options', 'questions', 'exams', 'course_enrollments', 'courses', 'subjects'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['role', 'status']));
    }
};
