<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'course_id' => ['required', 'integer', Rule::exists('courses', 'id')->whereNull('deleted_at')],
            'title' => ['required', 'string', 'max:255'], 'description' => ['nullable', 'string', 'max:30000'],
            'duration_minutes' => ['required', 'integer', 'between:1,1440'],
            'pass_mark' => ['required', 'numeric', 'min:0', 'max:999999'],
            'attempt_limit' => ['required', 'integer', 'between:1,1000'],
            'negative_marking' => ['required', 'boolean'], 'negative_mark_value' => ['required', 'numeric', 'between:0,10000'],
            'shuffle_questions' => ['required', 'boolean'], 'shuffle_options' => ['required', 'boolean'],
            'show_result' => ['required', 'boolean'], 'show_correct_answers' => ['required', 'boolean'],
            'status' => ['required', Rule::in(['draft', 'published', 'inactive'])],
            'questions' => ['present', 'array', 'max:1000'],
            'questions.*.question_id' => ['required', 'integer', 'distinct', Rule::exists('questions', 'id')->whereNull('deleted_at')],
            'questions.*.marks' => ['required', 'numeric', 'between:0,10000'],
            'questions.*.sort_order' => ['required', 'integer', 'min:0', 'distinct'],
        ];
    }
}
