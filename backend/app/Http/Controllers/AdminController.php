<?php

namespace App\Http\Controllers;

use App\Http\Requests\ExamRequest;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\Payment;
use App\Models\Question;
use App\Models\Subject;
use App\Models\User;
use App\Services\ExamService;
use App\Services\QuestionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    public function dashboard()
    {
        return ['stats' => [
            'doctors' => User::where('role', 'doctor')->count(), 'courses' => Course::count(),
            'free_courses' => Course::where('course_type', 'free')->count(), 'paid_courses' => Course::where('course_type', 'paid')->count(),
            'exams' => Exam::count(), 'questions' => Question::count(), 'attempts' => ExamAttempt::count(),
            'active_enrollments' => CourseEnrollment::active()->count(), 'pending_payments' => Payment::where('status', 'pending')->count(),
        ], 'recent_users' => User::where('role', 'doctor')->latest()->take(5)->get(),
            'recent_attempts' => ExamAttempt::with('user', 'exam')->latest()->take(5)->get(),
            'recent_payments' => Payment::with('user', 'course')->latest()->take(5)->get()];
    }

    public function courses(Request $r)
    {
        return Course::withCount('exams', 'enrollments')->when($r->input('search'), fn ($q, $s) => $q->where('title', 'like', '%'.$s.'%'))->latest()->paginate(50);
    }

    public function saveCourse(Request $r, ?Course $course = null)
    {
        $data = $r->validate([
            'title' => 'required|string|max:255', 'slug' => ['required', 'alpha_dash', 'max:255', Rule::unique('courses')->ignore($course?->id)],
            'short_description' => 'required|string|max:500', 'description' => 'required|string|max:30000',
            'course_type' => ['required', Rule::in(['free', 'paid'])], 'price' => 'required|numeric|min:0|max:99999999',
            'status' => ['required', Rule::in(['draft', 'published', 'inactive'])],
        ]);
        if ($data['course_type'] === 'free') {
            $data['price'] = 0;
        }
        if ($data['course_type'] === 'paid' && $data['price'] <= 0) {
            throw ValidationException::withMessages(['price' => 'A paid course needs a price greater than zero.']);
        }
        if ($course) {
            $course->update($data);

            return $course;
        }

        return response()->json(Course::create($data), 201);
    }

    public function deleteCourse(Course $course)
    {
        $course->delete();

        return response()->noContent();
    }

    public function subjects(Request $r)
    {
        return Subject::withCount('questions')->when($r->input('search'), fn ($q, $s) => $q->where('name', 'like', '%'.$s.'%'))->orderBy('name')->get();
    }

    public function saveSubject(Request $r, ?Subject $subject = null)
    {
        $data = $r->validate(['name' => ['required', 'string', 'max:150', Rule::unique('subjects')->ignore($subject?->id)], 'status' => ['required', Rule::in(['active', 'inactive'])]]);
        $data['slug'] = Str::slug($data['name']).'-'.substr(sha1($data['name']), 0, 8);
        if ($subject) {
            $subject->update($data);

            return $subject;
        }

        return Subject::create($data);
    }

    public function deleteSubject(Subject $subject)
    {
        $subject->delete();

        return response()->noContent();
    }

    public function questions(Request $r)
    {
        return Question::with('options', 'subject')->when($r->input('search'), fn ($q, $s) => $q->where('question_text', 'like', '%'.$s.'%'))
            ->when($r->input('subject') === 'uncategorized', fn ($q) => $q->whereNull('subject_id'))
            ->when(is_numeric($r->input('subject')), fn ($q) => $q->where('subject_id', $r->input('subject')))
            ->when($r->input('type'), fn ($q, $s) => $q->where('question_type', $s))->latest()->paginate(50);
    }

    public function saveQuestion(Request $r, QuestionService $service, ?Question $question = null)
    {
        return $service->save($r->all(), $question);
    }

    public function deleteQuestion(Question $question)
    {
        abort_if($question->exams()->where('status', 'published')->exists(), 422, 'Remove this question from published exams before archiving it.');
        $question->delete();

        return response()->noContent();
    }

    public function exams(Request $r)
    {
        return Exam::with('course')->withCount('questions')->when($r->input('course_id'), fn ($q, $id) => $q->where('course_id', $id))
            ->when($r->input('search'), fn ($q, $s) => $q->where('title', 'like', '%'.$s.'%'))->latest()->paginate(50);
    }

    public function exam(Exam $exam)
    {
        return $exam->load('questions.options', 'questions.subject');
    }

    public function saveExam(ExamRequest $r, ?Exam $exam = null)
    {
        return DB::transaction(function () use ($r, $exam) {
            $data = $r->validated();
            $assignments = $data['questions'];
            unset($data['questions']);
            if ($exam) {
                $exam = Exam::whereKey($exam->id)->lockForUpdate()->firstOrFail();
            }
            $questions = Question::with('options')->whereIn('id', array_column($assignments, 'question_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $pivot = [];
            $total = 0;
            $scored = 0;
            foreach ($assignments as $a) {
                $q = $questions->get($a['question_id']);
                if (! $q) {
                    throw ValidationException::withMessages(['questions' => 'An assigned question is no longer available.']);
                }
                if ($data['status'] === 'published') {
                    app(QuestionService::class)->validate($q->toArray(), true);
                }
                $marks = $q->question_type === 'information' ? 0 : (float) $a['marks'];
                if ($q->question_type !== 'information') {
                    $scored++;
                    if ($marks <= 0) {
                        throw ValidationException::withMessages(['questions' => 'Scored questions need marks greater than zero.']);
                    }
                }
                $total += $marks;
                $pivot[$q->id] = ['marks' => $marks, 'sort_order' => $a['sort_order']];
            }
            if ($data['status'] === 'published' && ! $scored) {
                throw ValidationException::withMessages(['questions' => 'Add at least one published, answerable question.']);
            }
            if ($data['pass_mark'] > $total && $data['status'] === 'published') {
                throw ValidationException::withMessages(['pass_mark' => 'Pass mark cannot exceed the total assigned marks.']);
            }
            $data['total_marks'] = $total;
            if ($exam) {
                $exam->update($data);
            } else {
                $exam = Exam::create($data);
            }
            $exam->questions()->sync($pivot);

            return $exam->load('questions.options');
        }, 3);
    }

    public function deleteExam(Exam $exam)
    {
        $exam->delete();

        return response()->noContent();
    }

    public function users(Request $r)
    {
        return User::withCount('enrollments', 'attempts')->when($r->input('search'), fn ($q, $s) => $q->where(fn ($x) => $x->where('name', 'like', '%'.$s.'%')->orWhere('email', 'like', '%'.$s.'%')))->latest()->paginate(30);
    }

    public function user(User $user)
    {
        return $user->load('enrollments.course', 'attempts.exam');
    }

    public function updateUser(Request $r, User $user)
    {
        $data = $r->validate(['status' => ['required', Rule::in(['active', 'inactive'])]]);
        abort_if($user->role === 'admin' && $data['status'] === 'inactive', 422, 'Administrator accounts cannot be deactivated here.');
        $user->update($data);
        if ($data['status'] === 'inactive') {
            DB::table('sessions')->where('user_id', $user->id)->delete();
            $user->tokens()->delete();
        }

        return $user;
    }

    public function enrollments(Request $r)
    {
        return CourseEnrollment::with('user', 'course')->when($r->input('course_id'), fn ($q, $id) => $q->where('course_id', $id))
            ->when($r->input('search'), fn ($q, $s) => $q->where(fn ($q) => $q->whereHas('user', fn ($u) => $u->where('name', 'like', '%'.$s.'%')->orWhere('email', 'like', '%'.$s.'%'))->orWhereHas('course', fn ($c) => $c->where('title', 'like', '%'.$s.'%'))))->latest()->paginate(30);
    }

    public function updateEnrollment(Request $r, CourseEnrollment $enrollment)
    {
        $data = $r->validate(['status' => ['required', Rule::in(['pending', 'active', 'expired', 'cancelled'])], 'expires_at' => 'nullable|date']);
        if ($data['status'] === 'active' && ! $enrollment->enrolled_at) {
            $data['enrolled_at'] = now();
        }
        $enrollment->update($data);

        return $enrollment->load('user', 'course');
    }

    public function payments(Request $r)
    {
        return Payment::with('user', 'course')->when($r->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($r->input('search'), fn ($q, $s) => $q->where(fn ($q) => $q->where('transaction_reference', 'like', '%'.$s.'%')->orWhereHas('user', fn ($u) => $u->where('name', 'like', '%'.$s.'%'))->orWhereHas('course', fn ($c) => $c->where('title', 'like', '%'.$s.'%'))))->latest()->paginate(30);
    }

    public function verifyPayment(Request $r, Payment $payment)
    {
        $data = $r->validate(['status' => ['required', Rule::in(['approved', 'rejected'])], 'review_note' => 'nullable|string|max:2000']);

        return DB::transaction(function () use ($r, $payment, $data) {
            User::whereKey($payment->user_id)->lockForUpdate()->first();
            $payment = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
            if ($payment->status === $data['status']) {
                return $payment;
            }
            abort_unless($payment->status === 'pending', 409, 'This payment has already been reviewed.');
            $payment->update($data + ['verified_at' => now(), 'verified_by' => $r->user()->id]);
            if ($data['status'] === 'approved') {
                CourseEnrollment::updateOrCreate(['user_id' => $payment->user_id, 'course_id' => $payment->course_id], ['status' => 'active', 'enrolled_at' => now(), 'expires_at' => null]);
            } else {
                CourseEnrollment::where('user_id', $payment->user_id)->where('course_id', $payment->course_id)->where('status', 'pending')->update(['status' => 'cancelled']);
            }

            return $payment;
        }, 3);
    }

    public function results(Request $r, ExamService $service)
    {
        $page = ExamAttempt::with('user', 'exam')->when($r->input('pending') === '1', fn ($q) => $q->where('pending_count', '>', 0))
            ->when($r->input('search'), fn ($q, $s) => $q->where(fn ($q) => $q->whereHas('user', fn ($u) => $u->where('name', 'like', '%'.$s.'%'))->orWhereHas('exam', fn ($e) => $e->where('title', 'like', '%'.$s.'%'))))->latest()->paginate(30);
        foreach ($page as $a) {
            if ($a->status === 'in_progress' && $a->expires_at->lte(now())) {
                $service->finish($a);
                $a->refresh()->load('user', 'exam');
            }
        }

        return $page;
    }

    public function result(ExamAttempt $attempt, ExamService $service)
    {
        return $service->result($attempt, true);
    }

    public function grade(Request $r, ExamAttempt $attempt, int $question, ExamService $service)
    {
        return DB::transaction(function () use ($r, $attempt, $question, $service) {
            $attempt = ExamAttempt::whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            abort_if($attempt->status === 'in_progress', 409, 'Submit the attempt before grading.');
            $q = collect($attempt->snapshot['questions'])->firstWhere('id', $question);
            abort_unless($q && $q['question_type'] === 'text_response', 422, 'Only text responses can be manually graded.');
            $data = $r->validate(['marks_awarded' => 'required|numeric|min:0|max:'.$q['marks'], 'feedback' => 'nullable|string|max:10000']);
            $attempt->answers()->where('question_id', $question)->firstOrFail()->update($data + ['is_correct' => null, 'grading_status' => 'graded', 'graded_by' => $r->user()->id, 'graded_at' => now()]);
            $service->recalculate($attempt);

            return $service->result($attempt->fresh(), true);
        }, 3);
    }

    public function settings(Request $r)
    {
        $data = $r->validate(['payment_instructions' => 'required|string|max:5000']);
        DB::table('settings')->updateOrInsert(['key' => 'payment_instructions'], ['value' => $data['payment_instructions']]);

        return $data;
    }
}
