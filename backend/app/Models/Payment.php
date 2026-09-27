<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['paid_at' => 'datetime', 'verified_at' => 'datetime', 'amount' => 'decimal:2'];
    }

    public function course()
    {
        return $this->belongsTo(Course::class)->withTrashed();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
