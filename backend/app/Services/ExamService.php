<?php

namespace App\Services;

use App\Models\CourseEnrollment;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ExamService
{
    public function checkAccess(User $user, Exam $exam): void
    {
        abort_unless($exam->status === 'published' && ! $exam->trashed() && $exam->course->status === 'published' && ! $exam->course->trashed(), 404, 'This exam is not available.');
        abort_unless(CourseEnrollment::where('user_id', $user->id)->where('course_id', $exam->course_id)->active()->exists(), 403, 'An active course enrollment is required.');
    }

    public function start(User $user, Exam $exam): ExamAttempt
    {
        return DB::transaction(function () use ($user, $exam) {
            // A per-user lock serializes concurrent starts and protects attempt limits.
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $exam = Exam::whereKey($exam->id)->lockForUpdate()->firstOrFail();
            $this->checkAccess($user, $exam);
            $existing = ExamAttempt::where('user_id', $user->id)->where('exam_id', $exam->id)->where('status', 'in_progress')->lockForUpdate()->first();
            if ($existing) {
                if ($existing->expires_at->lte(now())) {
                    $this->finish($existing);
                }

                return $existing->fresh();
            }
            abort_if(ExamAttempt::where('user_id', $user->id)->where('exam_id', $exam->id)->count() >= $exam->attempt_limit, 409, 'You have reached the attempt limit for this exam.');
            $questions = $exam->questions()->with('options', 'subject')->lockForUpdate()->get();
            abort_if($questions->isEmpty(), 422, 'This exam does not have questions yet.');
            foreach ($questions as $q) {
                app(QuestionService::class)->validate($q->toArray(), true);
            }
            if ($exam->shuffle_questions) {
                $questions = $questions->shuffle();
            }
            $snapshotQuestions = $questions->map(function ($q) use ($exam) {
                $options = $exam->shuffle_options ? $q->options->shuffle() : $q->options;

                return [
                    'id' => $q->id, 'question_text' => $q->question_text, 'question_type' => $q->question_type,
                    'subject' => $q->subject?->name, 'explanation' => $q->explanation,
                    'marks' => $q->question_type === 'information' ? 0 : (float) $q->pivot->marks,
                    'options' => $options->map(fn ($o) => ['id' => $o->id, 'option_text' => $o->option_text, 'is_correct' => $o->is_correct])->values()->all(),
                ];
            })->values()->all();
            $snapshot = [
                'title' => $exam->title, 'course_title' => $exam->course->title, 'pass_mark' => $exam->pass_mark,
                'negative_marking' => $exam->negative_marking, 'negative_mark_value' => $exam->negative_mark_value,
                'show_result' => $exam->show_result, 'show_correct_answers' => $exam->show_correct_answers,
                'questions' => $snapshotQuestions,
            ];
            $started = now();

            return ExamAttempt::create([
                'user_id' => $user->id, 'exam_id' => $exam->id, 'started_at' => $started,
                'expires_at' => $started->copy()->addMinutes($exam->duration_minutes), 'snapshot' => $snapshot,
                'total_questions' => count(array_filter($snapshotQuestions, fn ($q) => $q['question_type'] !== 'information')),
                'total_marks' => array_sum(array_column($snapshotQuestions, 'marks')),
            ])->fresh();
        }, 3);
    }

    public function finish(ExamAttempt $attempt): ExamAttempt
    {
        return DB::transaction(function () use ($attempt) {
            $attempt = ExamAttempt::whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            if ($attempt->status !== 'in_progress') {
                return $attempt;
            }
            foreach ($attempt->snapshot['questions'] as $q) {
                if ($q['question_type'] === 'information') {
                    continue;
                }
                $answer = $attempt->answers()->firstOrCreate(['question_id' => $q['id']]);
                if ($q['question_type'] === 'single_choice') {
                    $correct = collect($q['options'])->firstWhere('is_correct', true);
                    $hasAnswer = $answer->selected_option_id !== null;
                    $isCorrect = $hasAnswer && $answer->selected_option_id === $correct['id'];
                    $marks = $isCorrect ? $q['marks'] : ($hasAnswer && $attempt->snapshot['negative_marking'] ? -$attempt->snapshot['negative_mark_value'] : 0);
                    $answer->update(['is_correct' => $hasAnswer ? $isCorrect : null, 'marks_awarded' => $marks, 'grading_status' => 'graded']);
                }
                // All text responses, including empty ones, are left for explicit manual review.
            }
            $attempt->update(['status' => $attempt->expires_at->lte(now()) ? 'expired' : 'submitted', 'submitted_at' => now()]);

            return $this->recalculate($attempt);
        }, 3);
    }

    public function recalculate(ExamAttempt $attempt): ExamAttempt
    {
        $answers = $attempt->answers()->get();
        $attempt->update([
            'score' => round($answers->sum('marks_awarded'), 2),
            'correct_count' => $answers->where('is_correct', true)->count(),
            'wrong_count' => $answers->filter(fn ($a) => $a->is_correct === false)->count(),
            'unanswered_count' => $answers->filter(fn ($a) => $a->selected_option_id === null && trim($a->text_answer ?? '') === '')->count(),
            'pending_count' => $answers->where('grading_status', 'pending')->count(),
        ]);

        return $attempt->fresh();
    }

    public function saveAnswer(ExamAttempt $attempt, array $data): bool
    {
        return DB::transaction(function () use ($attempt, $data) {
            $attempt = ExamAttempt::whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            if ($attempt->status !== 'in_progress') {
                return false;
            }
            if ($attempt->expires_at->lte(now())) {
                $this->finish($attempt);

                return false;
            }
            abort_unless(CourseEnrollment::where('user_id', $attempt->user_id)->where('course_id', $attempt->exam->course_id)->active()->exists(), 403, 'An active course enrollment is required.');
            $q = collect($attempt->snapshot['questions'])->firstWhere('id', (int) $data['question_id']);
            abort_unless($q, 422, 'This question does not belong to the attempt.');
            abort_if($q['question_type'] === 'information', 422, 'Information prompts do not accept answers.');
            $option = $data['selected_option_id'] ?? null;
            $text = $data['text_answer'] ?? null;
            if ($q['question_type'] === 'single_choice') {
                if ($text !== null || ($option !== null && ! in_array($option, array_column($q['options'], 'id')))) {
                    throw ValidationException::withMessages(['selected_option_id' => 'Choose an option belonging to this question.']);
                }
            } elseif ($option !== null) {
                throw ValidationException::withMessages(['text_answer' => 'A text response cannot select an option.']);
            }
            $attempt->answers()->updateOrCreate(['question_id' => $q['id']], ['selected_option_id' => $option, 'text_answer' => $text, 'answered_at' => now()]);

            return true;
        }, 3);
    }

    public function activePayload(ExamAttempt $attempt): array
    {
        if ($attempt->status === 'in_progress' && $attempt->expires_at->lte(now())) {
            $attempt = $this->finish($attempt);
        }

        // An allowlist protects the key even if the internal snapshot gains new fields later.
        return [
            'id' => $attempt->id, 'exam_id' => $attempt->exam_id, 'title' => $attempt->snapshot['title'],
            'status' => $attempt->status, 'started_at' => $attempt->started_at, 'expires_at' => $attempt->expires_at, 'server_now' => now()->toISOString(),
            'total_questions' => $attempt->total_questions, 'total_marks' => $attempt->total_marks,
            'questions' => collect($attempt->snapshot['questions'])->map(fn ($q) => [
                'id' => $q['id'], 'question_text' => $q['question_text'], 'question_type' => $q['question_type'], 'subject' => $q['subject'], 'marks' => $q['marks'],
                'options' => array_map(fn ($o) => ['id' => $o['id'], 'option_text' => $o['option_text']], $q['options']),
            ])->all(),
            'answers' => $attempt->answers()->get()->map(fn ($a) => $a->only(['question_id', 'selected_option_id', 'text_answer', 'answered_at']))->all(),
        ];
    }

    public function result(ExamAttempt $attempt, bool $admin = false): array
    {
        if ($attempt->status === 'in_progress' && $attempt->expires_at->lte(now())) {
            $attempt = $this->finish($attempt);
        }
        abort_if($attempt->status === 'in_progress', 409, 'Submit the exam to view your result.');
        $base = ['id' => $attempt->id, 'exam_id' => $attempt->exam_id, 'title' => $attempt->snapshot['title'], 'course_title' => $attempt->snapshot['course_title'], 'status' => $attempt->status, 'submitted_at' => $attempt->submitted_at, 'started_at' => $attempt->started_at];
        if (! $admin && ! $attempt->snapshot['show_result']) {
            return $base + ['result_visible' => false, 'message' => 'Your exam has been submitted. Results are not available for this exam.'];
        }
        $review = $admin || $attempt->snapshot['show_correct_answers'];
        $answers = $attempt->answers()->get()->keyBy('question_id');

        return $base + [
            'result_visible' => true, 'review_visible' => $review, 'score' => $attempt->score, 'total_marks' => $attempt->total_marks,
            'correct_count' => $attempt->correct_count, 'wrong_count' => $attempt->wrong_count, 'unanswered_count' => $attempt->unanswered_count,
            'pending_count' => $attempt->pending_count, 'total_questions' => $attempt->total_questions,
            'percentage' => $attempt->pending_count === 0 && $attempt->total_marks > 0 ? round(100 * $attempt->score / $attempt->total_marks, 1) : null,
            'passed' => $attempt->pending_count === 0 && $attempt->total_marks > 0 ? $attempt->score >= $attempt->snapshot['pass_mark'] : null,
            'pass_mark' => $attempt->snapshot['pass_mark'],
            'questions' => $review ? collect($attempt->snapshot['questions'])->map(fn ($q) => $q + ['answer' => $answers->get($q['id'])])->all() : [],
            'user' => $admin ? $attempt->user->only(['id', 'name', 'email']) : null,
        ];
    }

    public function history(ExamAttempt $attempt): array
    {
        if ($attempt->status === 'in_progress' && $attempt->expires_at->lte(now())) {
            $attempt = $this->finish($attempt);
        }
        $visible = $attempt->status !== 'in_progress' && $attempt->snapshot['show_result'];

        return ['id' => $attempt->id, 'exam_id' => $attempt->exam_id, 'title' => $attempt->snapshot['title'], 'status' => $attempt->status,
            'started_at' => $attempt->started_at, 'submitted_at' => $attempt->submitted_at, 'total_marks' => $visible ? $attempt->total_marks : null,
            'score' => $visible ? $attempt->score : null, 'pending_count' => $visible ? $attempt->pending_count : null];
    }
}
