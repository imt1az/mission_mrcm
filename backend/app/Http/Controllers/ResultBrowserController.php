<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Services\ExamService;
use Illuminate\Http\Request;

class ResultBrowserController extends Controller
{
    public function options()
    {
        return ['courses' => Course::withTrashed()->orderBy('title')->get(['id', 'title', 'deleted_at'])];
    }

    public function courses(Request $r)
    {
        return Course::withTrashed()->withCount(['exams' => fn ($q) => $q->withTrashed(), 'attempts'])
            ->when($r->input('search'), fn ($q, $s) => $q->where('title', 'like', '%'.$s.'%'))
            ->when($r->input('type'), fn ($q, $s) => $q->where('course_type', $s))
            ->orderByDesc('id')->paginate(12);
    }

    public function exams(Request $r)
    {
        $r->validate(['course_id' => 'required|integer|exists:courses,id']);

        return Exam::withTrashed()->where('course_id', $r->course_id)->with('course')
            ->withCount(['attempts', 'attempts as grading_count' => fn ($q) => $q->where('pending_count', '>', 0)])
            ->when($r->input('search'), fn ($q, $s) => $q->where('title', 'like', '%'.$s.'%'))
            ->when($r->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('id')->paginate(12);
    }

    public function results(Request $r, ExamService $service)
    {
        $r->validate(['date_from' => 'nullable|date_format:Y-m-d', 'date_to' => 'nullable|date_format:Y-m-d']);
        $base = ExamAttempt::query()
            ->when($r->input('course_id'), fn ($q, $id) => $q->whereHas('exam', fn ($e) => $e->where('course_id', $id)))
            ->when($r->input('exam_id'), fn ($q, $id) => $q->where('exam_id', $id));
        // Finalise expired attempts before applying status/grading filters and counting.
        (clone $base)->where('status', 'in_progress')->where('expires_at', '<=', now())
            ->chunkById(100, function ($attempts) use ($service) {
                foreach ($attempts as $attempt) {
                    $service->finish($attempt);
                }
            });
        $query = $base->with('user', 'exam.course')
            ->when($r->input('search'), fn ($q, $s) => $q->where(fn ($q) => $q
                ->whereHas('user', fn ($u) => $u->where('name', 'like', '%'.$s.'%')->orWhere('email', 'like', '%'.$s.'%'))
                ->orWhereHas('exam', fn ($e) => $e->where('title', 'like', '%'.$s.'%'))))
            ->when($r->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($r->input('pending') === '1', fn ($q) => $q->where('pending_count', '>', 0))
            ->when($r->input('date_from'), fn ($q, $d) => $q->whereDate('started_at', '>=', $d))
            ->when($r->input('date_to'), fn ($q, $d) => $q->whereDate('started_at', '<=', $d));
        $summary = ['attempts' => (clone $query)->count(), 'students' => (clone $query)->distinct()->count('user_id'),
            'awaiting_grading' => (clone $query)->where('pending_count', '>', 0)->count(),
            'completed' => (clone $query)->where('status', '!=', 'in_progress')->count()];
        $page = $query->orderBy('id', $r->input('sort') === 'oldest' ? 'asc' : 'desc')->paginate(30);
        $page->getCollection()->each(function ($a) {
            $complete = $a->status !== 'in_progress';
            $a->setAttribute('percentage', $complete && $a->total_marks > 0 ? round(100 * $a->score / $a->total_marks, 1) : null);
            $a->setAttribute('passed', $complete && ! $a->pending_count && $a->total_marks > 0 ? $a->score >= ($a->snapshot['pass_mark'] ?? 0) : null);
            $a->setAttribute('exam_title', $a->snapshot['title'] ?? $a->exam?->title);
        });

        return $page->toArray() + ['summary' => $summary];
    }
}
