<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CourseEnrollment extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['enrolled_at' => 'datetime', 'expires_at' => 'datetime'];
    }

    public function course()
    {
        return $this->belongsTo(Course::class)->withTrashed();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active')->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
    }
}
