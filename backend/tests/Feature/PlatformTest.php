<?php

namespace Tests\Feature;

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
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;
use Tests\TestCase;

class PlatformTest extends TestCase
{
    use RefreshDatabase;

    private User $doctor;

    private User $admin;

    private Course $course;

    private Exam $exam;

    private Question $choice;

    private Question $text;

    protected function setUp(): void
    {
        parent::setUp();
        $this->doctor = User::factory()->create(['role' => 'doctor', 'status' => 'active']);
        $this->admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        $this->course = Course::create(['title' => 'Demo course', 'slug' => 'demo-course', 'short_description' => 'Demo', 'description' => 'Demo course', 'course_type' => 'free', 'price' => 0, 'status' => 'published']);
        CourseEnrollment::create(['user_id' => $this->doctor->id, 'course_id' => $this->course->id, 'status' => 'active', 'enrolled_at' => now()]);
        $this->choice = app(QuestionService::class)->save($this->choiceData());
        $this->text = app(QuestionService::class)->save(['subject_id' => null, 'question_type' => 'text_response', 'question_text' => 'Explain your reasoning.', 'explanation' => null, 'status' => 'published', 'options' => []]);
        $this->exam = Exam::create(['course_id' => $this->course->id, 'title' => 'Demo exam', 'duration_minutes' => 10, 'pass_mark' => 2, 'attempt_limit' => 2, 'negative_marking' => true, 'negative_mark_value' => 0.5, 'shuffle_options' => true, 'status' => 'published', 'total_marks' => 5]);
        $this->exam->questions()->attach($this->choice->id, ['marks' => 2, 'sort_order' => 0]);
        $this->exam->questions()->attach($this->text->id, ['marks' => 3, 'sort_order' => 1]);
    }

    private function choiceData(array $overrides = []): array
    {
        return array_replace(['subject_id' => null, 'question_type' => 'single_choice', 'question_text' => 'Choose the test answer.', 'explanation' => 'The correct explanation must stay secret.', 'status' => 'published', 'options' => [
            ['option_text' => 'First', 'is_correct' => true, 'sort_order' => 0], ['option_text' => 'Second', 'is_correct' => false, 'sort_order' => 1],
        ]], $overrides);
    }

    private function start(): ExamAttempt
    {
        return app(ExamService::class)->start($this->doctor, $this->exam);
    }

    private function answer(ExamAttempt $a, Question $q, ?int $option = null, ?string $text = null)
    {
        return $this->actingAs($this->doctor)->putJson("/api/exam-attempts/{$a->id}/answer", ['question_id' => $q->id, 'selected_option_id' => $option, 'text_answer' => $text]);
    }

    public function test_mysql_is_used_and_guests_and_doctors_cannot_access_admin(): void
    {
        $this->assertSame('mysql', DB::connection()->getDriverName());
        $this->getJson('/api/admin/dashboard')->assertUnauthorized();
        $this->getJson('/api/courses')->assertOk()->assertJsonPath('total', 1);
        $this->actingAs($this->doctor)->getJson('/api/admin/questions')->assertForbidden();
        $this->actingAs($this->admin)->getJson('/api/admin/dashboard')->assertOk();
    }

    public function test_registration_ignores_privileged_fields_and_establishes_session(): void
    {
        $this->withHeaders(['Origin' => 'http://127.0.0.1:5173'])->postJson('/api/auth/register', ['name' => 'New doctor', 'email' => 'new@example.com', 'password' => 'SafePassword2026', 'password_confirmation' => 'SafePassword2026', 'role' => 'admin', 'status' => 'inactive'])->assertCreated()->assertJsonPath('role', 'doctor')->assertJsonPath('status', 'active');
        $this->getJson('/api/auth/user')->assertOk()->assertJsonPath('email', 'new@example.com');
    }

    public function test_inactive_users_are_rejected(): void
    {
        $this->doctor->update(['status' => 'inactive']);
        $this->actingAs($this->doctor)->getJson('/api/dashboard')->assertForbidden();
    }

    public function test_free_enrollment_is_idempotent_and_paid_course_cannot_be_enrolled_for_free(): void
    {
        $this->actingAs($this->doctor)->postJson("/api/courses/{$this->course->id}/enroll")->assertOk();
        $this->postJson("/api/courses/{$this->course->id}/enroll")->assertOk();
        $this->assertDatabaseCount('course_enrollments', 1);
        $this->course->update(['course_type' => 'paid', 'price' => 100]);
        $this->postJson("/api/courses/{$this->course->id}/enroll")->assertUnprocessable();
    }

    public function test_subjects_and_option_counts_are_flexible_and_published_validation_is_enforced(): void
    {
        $this->actingAs($this->admin)->postJson('/api/admin/questions', $this->choiceData(['status' => 'draft', 'options' => []]))->assertSuccessful()->assertJsonPath('subject_id', null)->assertJsonCount(0, 'options');
        $this->postJson('/api/admin/questions', $this->choiceData(['options' => []]))->assertUnprocessable();
        $many = [];
        for ($i = 0; $i < 8; $i++) {
            $many[] = ['option_text' => "Option {$i}", 'sort_order' => $i, 'is_correct' => $i === 7];
        }
        $this->postJson('/api/admin/questions', $this->choiceData(['options' => $many]))->assertSuccessful()->assertJsonCount(8, 'options');
        $this->postJson('/api/admin/questions', $this->choiceData(['question_type' => 'text_response']))->assertUnprocessable();
        $this->postJson('/api/admin/questions', $this->choiceData(['options' => array_map(fn ($o) => array_replace($o, ['is_correct' => true]), $this->choiceData()['options'])]))->assertUnprocessable();
    }

    public function test_deleting_subject_preserves_uncategorized_questions(): void
    {
        $subject = Subject::create(['name' => 'Test subject', 'slug' => 'test', 'status' => 'active']);
        $this->choice->update(['subject_id' => $subject->id]);
        $this->actingAs($this->admin)->deleteJson("/api/admin/subjects/{$subject->id}")->assertNoContent();
        $this->assertNull($this->choice->fresh()->subject_id);
        $this->getJson('/api/admin/questions?subject=uncategorized')->assertOk()->assertJsonPath('total', 2);
    }

    public function test_start_requires_enrollment_resumes_timer_and_hides_answers(): void
    {
        $other = User::factory()->create();
        $this->actingAs($other)->postJson("/api/exams/{$this->exam->id}/start")->assertForbidden();
        $a = $this->actingAs($this->doctor)->postJson("/api/exams/{$this->exam->id}/start")->assertOk()->json();
        $this->assertArrayNotHasKey('is_correct', $a['questions'][0]['options'][0]);
        $this->assertArrayNotHasKey('explanation', $a['questions'][0]);
        $this->assertArrayNotHasKey('snapshot', $a);
        $this->travel(2)->minutes();
        $this->postJson("/api/exams/{$this->exam->id}/start")->assertOk()->assertJsonPath('id', $a['id'])->assertJsonPath('expires_at', $a['expires_at']);
        $this->getJson("/api/exam-attempts/{$a['id']}/result")->assertConflict();
    }

    public function test_answers_belong_to_the_attempt_and_question_type(): void
    {
        $a = $this->start();
        $other = User::factory()->create();
        $this->actingAs($other)->getJson("/api/exam-attempts/{$a->id}")->assertForbidden();
        $this->actingAs($other)->postJson("/api/exam-attempts/{$a->id}/submit")->assertForbidden();
        $this->answer($a, $this->choice, 999999)->assertUnprocessable();
        $this->answer($a, $this->text, $this->choice->options[0]->id)->assertUnprocessable();
        $this->answer($a, $this->choice, null, 'Not allowed')->assertUnprocessable();
        $this->answer($a, $this->choice, $this->choice->options[0]->id)->assertOk();
    }

    public function test_deadline_rejects_late_answer_and_finalizes_attempt_without_rolling_back(): void
    {
        $a = $this->start();
        $this->travel(10)->minutes();
        $this->answer($a, $this->choice, $this->choice->options[0]->id)->assertConflict();
        $this->assertSame('expired', $a->fresh()->status);
        $this->assertNull($a->answers()->where('question_id', $this->choice->id)->first()->selected_option_id);
        $this->assertSame(0.0, $a->fresh()->score);
    }

    public function test_revoked_enrollment_cannot_continue_an_active_attempt(): void
    {
        $attempt = $this->start();
        CourseEnrollment::where('user_id', $this->doctor->id)->update(['status' => 'cancelled']);
        $this->actingAs($this->doctor)->getJson("/api/exam-attempts/{$attempt->id}")->assertForbidden();
        $this->answer($attempt, $this->choice, $this->choice->options[0]->id)->assertForbidden();
        // Ending an existing attempt still remains possible after access is revoked.
        $this->postJson("/api/exam-attempts/{$attempt->id}/submit")->assertOk();
    }

    public function test_scheduler_expires_unattended_attempts(): void
    {
        $a = $this->start();
        $this->travel(11)->minutes();
        $this->artisan('exams:expire')->assertSuccessful();
        $this->assertSame('expired', $a->fresh()->status);
    }

    public function test_submission_is_idempotent_and_text_grading_controls_final_result(): void
    {
        $a = $this->start();
        $this->answer($a, $this->choice, $this->choice->options[0]->id)->assertOk();
        $this->answer($a, $this->text, null, 'My reasoning')->assertOk();
        $this->postJson("/api/exam-attempts/{$a->id}/submit")->assertOk();
        $this->postJson("/api/exam-attempts/{$a->id}/submit")->assertOk();
        $this->getJson("/api/exam-attempts/{$a->id}/result")->assertOk()->assertJsonPath('score', 2)->assertJsonPath('pending_count', 1)->assertJsonPath('passed', null)->assertJsonPath('percentage', null);
        $this->answer($a, $this->text, null, 'Changed')->assertConflict();
        $this->actingAs($this->admin)->putJson("/api/admin/results/{$a->id}/grade/{$this->text->id}", ['marks_awarded' => 4])->assertUnprocessable();
        $this->putJson("/api/admin/results/{$a->id}/grade/{$this->text->id}", ['marks_awarded' => 2.5, 'feedback' => 'Good response'])->assertOk()->assertJsonPath('score', 4.5)->assertJsonPath('pending_count', 0)->assertJsonPath('percentage', 90)->assertJsonPath('passed', true);
        $this->assertNull($a->answers()->where('question_id', $this->text->id)->first()->is_correct);
        $this->assertSame(1, $a->fresh()->correct_count);
    }

    public function test_negative_scoring_unanswered_and_information_prompts(): void
    {
        $info = Question::create(['question_type' => 'information', 'question_text' => 'Read this.', 'status' => 'published']);
        $this->exam->questions()->attach($info->id, ['marks' => 0, 'sort_order' => 2]);
        $a = $this->start();
        $this->answer($a, $info)->assertUnprocessable();
        $this->answer($a, $this->choice, $this->choice->options[1]->id)->assertOk();
        $this->postJson("/api/exam-attempts/{$a->id}/submit")->assertOk();
        $this->getJson("/api/exam-attempts/{$a->id}/result")->assertOk()->assertJsonPath('score', -0.5)->assertJsonPath('wrong_count', 1)->assertJsonPath('unanswered_count', 1)->assertJsonPath('total_questions', 2);
        $this->assertSame(2, $a->answers()->count());
    }

    public function test_snapshots_preserve_old_option_ids_question_text_and_scoring(): void
    {
        $a = $this->start();
        $oldOption = $this->choice->options[0]->id;
        app(QuestionService::class)->save($this->choiceData(['question_text' => 'Changed after start']), $this->choice);
        $this->exam->update(['pass_mark' => 5, 'negative_mark_value' => 100]);
        $this->answer($a, $this->choice, $oldOption)->assertOk();
        $this->postJson("/api/exam-attempts/{$a->id}/submit")->assertOk();
        $this->getJson("/api/exam-attempts/{$a->id}/result")->assertOk()->assertJsonPath('score', 2)->assertJsonPath('pass_mark', 2)->assertJsonPath('questions.0.question_text', 'Choose the test answer.');
        app(QuestionService::class)->save($this->choiceData(['question_text' => 'Changed again']), $this->choice);
        $this->assertSame(2.0, $a->fresh()->score);
    }

    public function test_hidden_results_do_not_leak_in_history_or_dashboard(): void
    {
        $this->exam->update(['show_result' => false]);
        $a = $this->start();
        app(ExamService::class)->finish($a);
        $this->actingAs($this->doctor)->getJson("/api/exam-attempts/{$a->id}/result")->assertOk()->assertJsonPath('result_visible', false)->assertJsonMissingPath('score')->assertJsonMissingPath('questions');
        $this->getJson('/api/my-attempts')->assertOk()->assertJsonPath('data.0.score', null);
        $this->getJson('/api/dashboard')->assertOk()->assertJsonPath('recent_attempts.0.score', null)->assertJsonPath('average_score', null);
    }

    public function test_correct_answer_visibility_and_attempt_limit_are_enforced(): void
    {
        $this->exam->update(['show_correct_answers' => false, 'attempt_limit' => 1]);
        $a = $this->start();
        app(ExamService::class)->finish($a);
        $this->actingAs($this->doctor)->getJson("/api/exam-attempts/{$a->id}/result")->assertOk()->assertJsonPath('review_visible', false)->assertJsonCount(0, 'questions');
        $this->postJson("/api/exams/{$this->exam->id}/start")->assertConflict();
    }

    public function test_paid_enrollment_activates_only_on_idempotent_admin_approval(): void
    {
        $this->course->update(['course_type' => 'paid', 'price' => 4500]);
        CourseEnrollment::where('user_id', $this->doctor->id)->update(['status' => 'cancelled']);
        $response = $this->actingAs($this->doctor)->postJson("/api/courses/{$this->course->id}/payments", ['payment_method' => 'bKash', 'transaction_reference' => 'DEMO-12345', 'paid_at' => now()->subMinute()->toISOString(), 'amount' => 1, 'status' => 'approved'])->assertSuccessful()->assertJsonPath('amount', '4500.00');
        $payment = Payment::findOrFail($response->json('id'));
        $this->assertSame('pending', $payment->status);
        $this->putJson("/api/admin/payments/{$payment->id}", ['status' => 'approved'])->assertForbidden();
        $this->actingAs($this->admin)->putJson("/api/admin/payments/{$payment->id}", ['status' => 'approved'])->assertOk();
        $this->putJson("/api/admin/payments/{$payment->id}", ['status' => 'approved'])->assertOk();
        $this->assertDatabaseCount('course_enrollments', 1);
        $this->assertDatabaseHas('course_enrollments', ['user_id' => $this->doctor->id, 'status' => 'active']);
        $this->putJson("/api/admin/payments/{$payment->id}", ['status' => 'rejected'])->assertConflict();
    }

    public function test_password_reset_sends_frontend_link_and_changes_password(): void
    {
        Notification::fake();
        $this->withHeaders(['Origin' => 'http://127.0.0.1:5173'])->postJson('/api/auth/forgot-password', ['email' => $this->doctor->email])->assertOk();
        $token = null;
        Notification::assertSentTo($this->doctor, ResetPassword::class, function ($n) use (&$token) {
            $token = $n->token;

            return true;
        });
        $this->postJson('/api/auth/reset-password', ['email' => $this->doctor->email, 'token' => $token, 'password' => 'NewSafePassword2026', 'password_confirmation' => 'NewSafePassword2026'])->assertOk();
        $this->assertTrue(Hash::check('NewSafePassword2026', $this->doctor->fresh()->password));
    }

    private function workbook(array $questions, array $options = []): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'test-xlsx-');
        $w = new Writer;
        $w->openToFile($path);
        $w->getCurrentSheet()->setName('Questions');
        $w->addRow(Row::fromValues(['question_key', 'question_type', 'subject', 'question', 'explanation', 'status']));
        foreach ($questions as $row) {
            $w->addRow(Row::fromValues($row));
        }
        if ($options) {
            $w->addNewSheetAndMakeItCurrent()->setName('Options');
            $w->addRow(Row::fromValues(['question_key', 'sort_order', 'option_text', 'is_correct']));
            foreach ($options as $row) {
                $w->addRow(Row::fromValues($row));
            }
        }$w->close();
        $file = UploadedFile::fake()->createWithContent('questions.xlsx', file_get_contents($path));
        unlink($path);

        return $file;
    }

    public function test_excel_optional_options_sheet_preview_and_one_time_confirmation(): void
    {
        $file = $this->workbook([['Q1', 'text_response', '', 'Explain the example.', '', 'published'], ['Q2', 'single_choice', '', 'Incomplete draft', '', 'draft']]);
        $preview = $this->actingAs($this->admin)->postJson('/api/admin/question-import/preview', ['file' => $file, 'create_subjects' => false])->assertOk()->assertJsonPath('valid_count', 2)->assertJsonPath('skipped_count', 0);
        $id = $preview->json('id');
        $this->assertDatabaseCount('questions', 2);
        $this->postJson("/api/admin/question-import/{$id}/confirm", ['skip_invalid' => false])->assertOk()->assertJsonPath('imported', 2);
        $this->postJson("/api/admin/question-import/{$id}/confirm", ['skip_invalid' => false])->assertConflict();
        $this->assertDatabaseCount('questions', 4);
    }

    public function test_excel_reports_duplicate_keys_sort_orders_flags_and_orphans_and_skips_whole_question(): void
    {
        $file = $this->workbook([
            ['OK', 'text_response', '', 'Valid written response', '', 'published'], ['BAD', 'single_choice', '', 'Invalid options', '', 'published'],
            ['DUP', 'information', '', 'Duplicate one', '', 'published'], ['DUP', 'information', '', 'Duplicate two', '', 'published'],
        ], [['BAD', 0, 'One', 1], ['BAD', 0, 'Two', 'yes'], ['MISSING', 1, 'Orphan', 0]]);
        $preview = $this->actingAs($this->admin)->postJson('/api/admin/question-import/preview', ['file' => $file, 'create_subjects' => false])->assertOk()->assertJsonPath('valid_count', 1)->assertJsonPath('skipped_count', 3);
        $this->assertGreaterThanOrEqual(5, count($preview->json('errors')));
        $id = $preview->json('id');
        $this->postJson("/api/admin/question-import/{$id}/confirm", ['skip_invalid' => false])->assertUnprocessable();
        $this->postJson("/api/admin/question-import/{$id}/confirm", ['skip_invalid' => true])->assertOk()->assertJsonPath('imported', 1)->assertJsonPath('skipped', 3);
        $this->assertDatabaseCount('questions', 3);
        $this->assertDatabaseCount('question_options', 2);
    }

    public function test_exam_publication_validates_assigned_questions_and_computes_marks(): void
    {
        $draft = app(QuestionService::class)->save($this->choiceData(['status' => 'draft', 'options' => []]));
        $data = ['course_id' => $this->course->id, 'title' => 'New exam', 'duration_minutes' => 30, 'pass_mark' => 1, 'attempt_limit' => 2, 'negative_marking' => false, 'negative_mark_value' => 0, 'shuffle_questions' => true, 'shuffle_options' => true, 'show_result' => true, 'show_correct_answers' => true, 'status' => 'published', 'questions' => [['question_id' => $draft->id, 'marks' => 2, 'sort_order' => 0]]];
        $this->actingAs($this->admin)->postJson('/api/admin/exams', $data)->assertUnprocessable();
        $data['questions'][0]['question_id'] = $this->choice->id;
        $this->postJson('/api/admin/exams', $data + ['total_marks' => 999])->assertSuccessful()->assertJsonPath('total_marks', 2);
    }
}
