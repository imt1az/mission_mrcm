<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\Payment;
use App\Models\User;
use App\Services\ExamService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LearningController extends Controller
{
    public function courses(Request $r)
    {
        return Course::where('status', 'published')->withCount(['exams' => fn ($q) => $q->where('status', 'published')])
            ->when($r->input('search'), fn ($q, $s) => $q->where('title', 'like', '%'.$s.'%'))
            ->when(in_array($r->input('type'), ['free', 'paid']), fn ($q) => $q->where('course_type', $r->input('type')))->orderBy('id')->paginate(12);
    }

    public function course(string $slug)
    {
        return Course::where('slug', $slug)->where('status', 'published')->with(['exams' => fn ($q) => $q->where('status', 'published')->withCount('questions')])->firstOrFail();
    }

    public function enroll(Request $r, Course $course)
    {
        abort_unless($course->status === 'published', 404);
        abort_unless($course->course_type === 'free', 422, 'Submit payment for this paid course.');

        return DB::transaction(function () use ($r, $course) {
            User::whereKey($r->user()->id)->lockForUpdate()->first();

            return CourseEnrollment::updateOrCreate(['user_id' => $r->user()->id, 'course_id' => $course->id], ['status' => 'active', 'enrolled_at' => now(), 'expires_at' => null]);
        }, 3);
    }

    public function myCourses(Request $r)
    {
        return $r->user()->enrollments()->with(['course' => fn ($q) => $q->withCount(['exams' => fn ($e) => $e->where('status', 'published')])])->latest()->get();
    }

    public function dashboard(Request $r, ExamService $service)
    {
        $attempts = $r->user()->attempts()->latest()->get();
        $history = $attempts->map(fn ($a) => $service->history($a));
        $graded = $history->filter(fn ($a) => $a['score'] !== null && ! $a['pending_count'] && $a['total_marks'] > 0);

        return ['enrolled_count' => $r->user()->enrollments()->active()->count(), 'attempt_count' => $attempts->count(),
            'average_score' => $graded->count() ? round($graded->avg(fn ($a) => 100 * $a['score'] / $a['total_marks'])) : null,
            'recent_attempts' => $history->take(5)->values(), 'enrollments' => $this->myCourses($r)->take(3)->values(),
            'available_courses' => Course::where('status', 'published')->withCount(['exams' => fn ($q) => $q->where('status', 'published')])->take(3)->get()];
    }

    public function exam(Request $r, Exam $exam, ExamService $service)
    {
        $service->checkAccess($r->user(), $exam);
        $attempts = $r->user()->attempts()->where('exam_id', $exam->id)->latest()->get()->map(fn ($a) => $service->history($a));

        return $exam->loadCount('questions')->toArray() + ['attempts' => $attempts, 'course_title' => $exam->course->title];
    }

    public function start(Request $r, Exam $exam, ExamService $service)
    {
        return $service->activePayload($service->start($r->user(), $exam));
    }

    private function own(Request $r, ExamAttempt $attempt): void
    {
        abort_unless($attempt->user_id === $r->user()->id, 403, 'This attempt belongs to another user.');
    }

    public function attempt(Request $r, ExamAttempt $attempt, ExamService $service)
    {
        $this->own($r, $attempt);
        if ($attempt->status === 'in_progress' && $attempt->expires_at->gt(now())) {
            abort_unless(CourseEnrollment::where('user_id', $r->user()->id)->where('course_id', $attempt->exam->course_id)->active()->exists(), 403, 'An active course enrollment is required.');
        }

        return $service->activePayload($attempt);
    }

    public function answer(Request $r, ExamAttempt $attempt, ExamService $service)
    {
        $this->own($r, $attempt);
        $data = $r->validate(['question_id' => 'required|integer', 'selected_option_id' => 'nullable|integer', 'text_answer' => 'nullable|string|max:30000']);
        abort_unless($service->saveAnswer($attempt, $data), 409, 'This attempt has ended. Answers can no longer be changed.');

        return ['message' => 'Answer saved.', 'server_now' => now()->toISOString()];
    }

    public function submit(Request $r, ExamAttempt $attempt, ExamService $service)
    {
        $this->own($r, $attempt);
        $attempt = $service->finish($attempt);

        return ['id' => $attempt->id, 'status' => $attempt->status];
    }

    public function result(Request $r, ExamAttempt $attempt, ExamService $service)
    {
        $this->own($r, $attempt);

        return $service->result($attempt);
    }

    public function history(Request $r, ExamService $service)
    {
        $page = $r->user()->attempts()->latest()->paginate(20);
        $page->setCollection($page->getCollection()->map(fn ($a) => $service->history($a)));

        return $page;
    }

    public function payments(Request $r)
    {
        return Payment::where('user_id', $r->user()->id)->with('course')->latest()->get();
    }

    public function payment(Request $r, Course $course)
    {
        abort_unless($course->status === 'published' && $course->course_type === 'paid', 422, 'This course does not accept payments.');
        $data = $r->validate(['payment_method' => 'required|string|max:100', 'transaction_reference' => 'required|string|max:255|unique:payments', 'paid_at' => 'required|date|before_or_equal:now']);

        return DB::transaction(function () use ($r, $course, $data) {
            User::whereKey($r->user()->id)->lockForUpdate()->first();
            abort_if(CourseEnrollment::where('user_id', $r->user()->id)->where('course_id', $course->id)->active()->exists(), 409, 'You are already enrolled.');
            abort_if(Payment::where('user_id', $r->user()->id)->where('course_id', $course->id)->where('status', 'pending')->exists(), 409, 'Your payment is already awaiting review.');
            CourseEnrollment::updateOrCreate(['user_id' => $r->user()->id, 'course_id' => $course->id], ['status' => 'pending']);

            return Payment::create($data + ['user_id' => $r->user()->id, 'course_id' => $course->id, 'amount' => $course->price]);
        }, 3);
    }

    public function settings()
    {
        return ['currency' => config('mission.currency'), 'payment_instructions' => DB::table('settings')->where('key', 'payment_instructions')->value('value') ?? config('mission.payment_instructions')];
    }
}
