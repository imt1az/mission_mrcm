<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\Exam;
use App\Models\Question;
use App\Models\Subject;
use App\Models\User;
use App\Services\QuestionService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            $this->command?->warn('Demo data is restricted to local and testing environments.');

            return;
        }
        User::firstOrCreate(['email' => 'admin@example.com'], ['name' => 'Demo Administrator', 'password' => 'AdminDemo2026!', 'role' => 'admin', 'status' => 'active']);
        $doctor = User::firstOrCreate(['email' => 'doctor@example.com'], ['name' => 'Dr. Alex Morgan', 'password' => 'DoctorDemo2026!', 'role' => 'doctor', 'status' => 'active']);
        foreach (['Anatomy', 'Physiology', 'Pharmacology', 'Pathology', 'Emergency Medicine'] as $name) {
            Subject::firstOrCreate(['name' => $name], ['slug' => Str::slug($name), 'status' => 'active']);
        }
        foreach ([
            ['MRCEM Primary', 'mrcem-primary', 'Build a strong foundation. One question at a time.', 'A focused introduction to the basic sciences behind emergency medicine. Practise anatomy, physiology, pharmacology and pathology, then review your answers to identify what to study next.', 'free', 0],
            ['MRCEM SBA', 'mrcem-sba', 'Bring your clinical knowledge into focus.', 'Develop a structured approach to single best answer questions with clinical scenarios and timed practice. Includes written reflection with tutor grading.', 'paid', 4500],
            ['Emergency Essentials', 'emergency-essentials', 'Refresh the fundamentals of emergency care.', 'A short practice course covering the foundations of emergency medicine. Start with an introductory assessment and build a consistent study routine.', 'free', 0],
        ] as [$title,$slug,$short,$desc,$type,$price]) {
            Course::firstOrCreate(['slug' => $slug], ['title' => $title, 'short_description' => $short, 'description' => $desc, 'course_type' => $type, 'price' => $price, 'status' => 'published']);
        }
        $primary = Course::where('slug', 'mrcem-primary')->first();
        CourseEnrollment::firstOrCreate(['user_id' => $doctor->id, 'course_id' => $primary->id], ['status' => 'active', 'enrolled_at' => now()]);
        $rows = [
            ['Which chamber forms most of the anterior surface of the heart?', 'Anatomy', ['Left atrium', 'Right ventricle', 'Left ventricle'], 1, 'The right ventricle forms most of the sternocostal surface of the heart.'],
            ['Which structure is the normal pacemaker of the heart?', 'Physiology', ['Sinoatrial node', 'Atrioventricular node', 'Bundle of His', 'Purkinje fibres'], 0, 'The sinoatrial node normally initiates the cardiac impulse.'],
            ['Which cranial nerve supplies the lateral rectus muscle?', 'Anatomy', ['Oculomotor nerve', 'Trochlear nerve', 'Abducens nerve'], 2, 'The abducens nerve (CN VI) supplies the lateral rectus.'],
            ['Which type of blood vessel carries blood away from the heart?', 'Physiology', ['Artery', 'Vein'], 0, 'Arteries carry blood away from the heart; veins return blood to the heart.'],
            ['Which organ produces insulin?', 'Physiology', ['Liver', 'Spleen', 'Pancreas', 'Thyroid', 'Adrenal gland', 'Kidney'], 2, 'Insulin is produced by beta cells in the pancreatic islets.'],
            ['Which plane divides the body into anterior and posterior portions?', 'Anatomy', ['Sagittal plane', 'Coronal plane', 'Transverse plane'], 1, 'The coronal (frontal) plane divides anterior and posterior portions.'],
        ];
        $ids = [];
        foreach ($rows as [$text,$subject,$options,$correct,$explanation]) {
            $q = Question::where('question_text', $text)->first();
            if (! $q) {
                $q = app(QuestionService::class)->save(['question_text' => $text, 'question_type' => 'single_choice', 'subject_id' => Subject::where('name', $subject)->value('id'), 'explanation' => $explanation, 'status' => 'published', 'options' => array_map(fn ($option, $i) => ['option_text' => $option, 'sort_order' => $i, 'is_correct' => $i === $correct], $options, array_keys($options))]);
            }
            $ids[] = $q->id;
        }
        $text = Question::firstOrCreate(['question_text' => 'In your own words, describe the role of the sinoatrial node.'], ['question_type' => 'text_response', 'subject_id' => null, 'status' => 'published']);
        $info = Question::firstOrCreate(['question_text' => 'This is a demonstration assessment. The sample questions illustrate the platform and are not a validated exam preparation syllabus.'], ['question_type' => 'information', 'subject_id' => null, 'status' => 'published']);
        foreach ([['Foundation check', 15, array_merge([$info->id], array_slice($ids, 0, 3)), 2], ['Basic sciences practice', 20, $ids, 4], ['Knowledge & reflection', 25, [$ids[1], $ids[3], $text->id], 3]] as [$title,$duration,$questionIds,$pass]) {
            $exam = Exam::firstOrCreate(['course_id' => $primary->id, 'title' => $title], ['description' => 'Take a focused practice session, then use your result to plan your next step.', 'duration_minutes' => $duration, 'pass_mark' => $pass, 'attempt_limit' => 10, 'status' => 'published']);
            $pivot = [];
            foreach ($questionIds as $i => $id) {
                $pivot[$id] = ['sort_order' => $i, 'marks' => $id === $info->id ? 0 : ($id === $text->id ? 3 : 1)];
            }
            $exam->questions()->sync($pivot);
            $exam->update(['total_marks' => array_sum(array_column($pivot, 'marks'))]);
        }
        foreach (['mrcem-sba', 'emergency-essentials'] as $slug) {
            $course = Course::where('slug', $slug)->first();
            $exam = Exam::firstOrCreate(['course_id' => $course->id, 'title' => 'Introductory assessment'], ['description' => 'A short demonstration assessment to get you started.', 'duration_minutes' => 15, 'pass_mark' => 2, 'attempt_limit' => 5, 'total_marks' => 3, 'status' => 'published']);
            $pivot = [];
            foreach (array_slice($ids, 0, 3) as $i => $id) {
                $pivot[$id] = ['sort_order' => $i, 'marks' => 1];
            } $exam->questions()->sync($pivot);
        }
    }
}
