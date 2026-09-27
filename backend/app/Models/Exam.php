<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Exam extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['negative_marking' => 'boolean', 'shuffle_questions' => 'boolean', 'shuffle_options' => 'boolean', 'show_result' => 'boolean', 'show_correct_answers' => 'boolean', 'total_marks' => 'float', 'pass_mark' => 'float', 'negative_mark_value' => 'float'];
    }

    public function course()
    {
        return $this->belongsTo(Course::class)->withTrashed();
    }

    public function questions()
    {
        return $this->belongsToMany(Question::class, 'exam_questions')->withPivot('marks', 'sort_order')->withTimestamps()->orderByPivot('sort_order');
    }

    public function attempts()
    {
        return $this->hasMany(ExamAttempt::class);
    }
}
