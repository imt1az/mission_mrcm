<?php

namespace App\Services;

use App\Models\Question;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class QuestionService
{
    public function validate(array $data, bool $live = false): array
    {
        $v = Validator::make($data, [
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'question_type' => ['required', Rule::in(['single_choice', 'text_response', 'information'])],
            'question_text' => ['required', 'string', 'max:30000'],
            'explanation' => ['nullable', 'string', 'max:30000'],
            'status' => ['required', Rule::in(['draft', 'published', 'inactive'])],
            'options' => ['present', 'array'],
            'options.*.option_text' => ['required', 'string', 'max:10000'],
            'options.*.sort_order' => ['required', 'integer', 'min:0', 'distinct'],
            'options.*.is_correct' => ['required', 'boolean'],
        ]);
        $v->after(function ($v) use ($data, $live) {
            $options = $data['options'] ?? [];
            if (! is_array($options)) {
                return;
            }
            $type = $data['question_type'] ?? '';
            if ($type !== 'single_choice' && count($options)) {
                $v->errors()->add('options', 'Text responses and information prompts must not have options.');
            }
            if ($type === 'single_choice' && ($live || ($data['status'] ?? '') === 'published')) {
                if (count($options) < 2) {
                    $v->errors()->add('options', 'A published single-choice question needs at least two options.');
                }
                if (count(array_filter($options, fn ($o) => is_array($o) && ($o['is_correct'] ?? false))) !== 1) {
                    $v->errors()->add('options', 'Select exactly one correct answer before publishing.');
                }
            }
            if ($live && ($data['status'] ?? '') !== 'published') {
                $v->errors()->add('status', 'Every question in a published exam must be published.');
            }
        });

        return $v->validate();
    }

    public function save(array $data, ?Question $question = null): Question
    {
        return DB::transaction(function () use ($data, $question) {
            if ($question) {
                $question = Question::lockForUpdate()->findOrFail($question->id);
            }
            $live = $question?->exams()->where('status', 'published')->exists() ?? false;
            $data = $this->validate($data, $live);
            if ($live && $question->question_type !== $data['question_type']) {
                throw ValidationException::withMessages(['question_type' => 'Unpublish linked exams before changing the question type.']);
            }
            $options = $data['options'];
            unset($data['options']);
            if ($question) {
                $question->update($data);
            } else {
                $question = Question::create($data);
            }
            // Attempts retain their own complete option snapshot, including original option IDs.
            $question->options()->delete();
            foreach ($options as $option) {
                $question->options()->create($option);
            }

            return $question->load('options', 'subject');
        });
    }
}
