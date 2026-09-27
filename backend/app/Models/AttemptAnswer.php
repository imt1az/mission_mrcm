<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttemptAnswer extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['is_correct' => 'boolean', 'marks_awarded' => 'float', 'answered_at' => 'datetime', 'graded_at' => 'datetime'];
    }

    public function attempt()
    {
        return $this->belongsTo(ExamAttempt::class, 'exam_attempt_id');
    }
}
