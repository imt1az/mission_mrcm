<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Course extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['price' => 'decimal:2'];
    }

    public function exams()
    {
        return $this->hasMany(Exam::class);
    }

    public function attempts()
    {
        return $this->hasManyThrough(ExamAttempt::class, Exam::class)->withTrashedParents();
    }

    public function enrollments()
    {
        return $this->hasMany(CourseEnrollment::class);
    }
}
