<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExamAttempt extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['snapshot'];

    protected function casts(): array
    {
        return ['snapshot' => 'array', 'started_at' => 'datetime', 'expires_at' => 'datetime', 'submitted_at' => 'datetime', 'score' => 'float', 'total_marks' => 'float'];
    }

    public function exam()
    {
        return $this->belongsTo(Exam::class)->withTrashed();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function answers()
    {
        return $this->hasMany(AttemptAnswer::class);
    }
}
