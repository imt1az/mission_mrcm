<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use App\Services\QuestionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Reader\XLSX\Reader;
use OpenSpout\Writer\XLSX\Writer;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ImportController extends Controller
{
    public function template()
    {
        $path = tempnam(sys_get_temp_dir(), 'mrcem-');
        $w = new Writer;
        $w->openToFile($path);
        $w->getCurrentSheet()->setName('Questions');
        foreach ([['question_key', 'question_type', 'subject', 'question', 'explanation', 'status'],
            ['Q001', 'single_choice', 'Anatomy', 'Which chamber forms most of the anterior surface of the heart?', 'The right ventricle forms most of the anterior surface.', 'published'],
            ['Q002', 'text_response', '', 'Describe the role of the SA node.', '', 'published'],
            ['Q003', 'information', '', 'Read the case before answering the next question.', '', 'published'],
            ['Q004', 'single_choice', '', 'Write your question here.', '', 'draft']] as $row) {
            $w->addRow(Row::fromValues($row));
        }
        $w->addNewSheetAndMakeItCurrent()->setName('Options');
        foreach ([['question_key', 'sort_order', 'option_text', 'is_correct'], ['Q001', 1, 'Left atrium', 0], ['Q001', 2, 'Right ventricle', 1], ['Q001', 3, 'Left ventricle', 0]] as $row) {
            $w->addRow(Row::fromValues($row));
        }
        $w->addNewSheetAndMakeItCurrent()->setName('Instructions');
        foreach (['Replace examples with your questions. Keep the Questions and Options headers unchanged.', 'Subject is optional. Enable Create unknown subjects during preview to create new categories.', 'question_key must be unique. Each option must reference an existing key.', 'Options sheet is optional. Add any number of options with distinct nonnegative integer sort_order values.', 'is_correct must be 0 or 1. Published single_choice requires at least two options and exactly one correct.', 'text_response and information must have no options. Draft single_choice may have zero options.', 'Preview errors before confirming. Invalid questions are skipped only when explicitly selected.'] as $line) {
            $w->addRow(Row::fromValues([$line]));
        }
        $w->close();

        return response()->download($path, 'mission-mrcem-question-template.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])->deleteFileAfterSend();
    }

    public function preview(Request $r, QuestionService $service)
    {
        $r->validate(['file' => 'required|file|mimes:xlsx|max:10240', 'create_subjects' => 'required|boolean']);
        $path = $r->file('file')->getRealPath();
        $zip = new \ZipArchive;
        abort_unless($zip->open($path) === true, 422, 'The workbook could not be opened.');
        $expanded = 0;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $expanded += $zip->statIndex($i)['size'];
        }
        $zip->close();
        abort_if($expanded > 100 * 1024 * 1024, 422, 'The expanded workbook exceeds 100 MB.');
        $reader = new Reader;
        $sheets = [];
        $rowCount = 0;
        try {
            $reader->open($path);
            foreach ($reader->getSheetIterator() as $sheet) {
                $name = $sheet->getName();
                if (! in_array($name, ['Questions', 'Options'])) {
                    continue;
                }
                $headers = null;
                $sheets[$name] = [];
                foreach ($sheet->getRowIterator() as $n => $row) {
                    abort_if(++$rowCount > 25000, 422, 'Import at most 25,000 workbook rows at a time.');
                    $values = array_map(fn ($v) => is_scalar($v) || $v === null ? trim((string) $v) : '', $row->toArray());
                    if (! $headers) {
                        $headers = $values;
                        $required = $name === 'Questions' ? ['question_key', 'question_type', 'subject', 'question', 'explanation', 'status'] : ['question_key', 'sort_order', 'option_text', 'is_correct'];
                        abort_if(array_diff($required, $headers), 422, "{$name}: use the headers from the template.");

                        continue;
                    }
                    if (! array_filter($values, fn ($v) => $v !== '')) {
                        continue;
                    }
                    $values = array_slice(array_pad($values, count($headers), ''), 0, count($headers));
                    $sheets[$name][] = array_combine($headers, $values) + ['_row' => $n];
                }
            }
        } catch (HttpException $e) {
            throw $e;
        } catch (\Throwable $e) {
            throw ValidationException::withMessages(['file' => 'Invalid workbook. Download the template and try again.']);
        } finally {
            $reader->close();
        }
        abort_if(empty($sheets['Questions']), 422, 'The Questions sheet must contain at least one question.');
        $errors = [];
        $keys = [];
        $groups = [];
        $duplicates = [];
        foreach ($sheets['Questions'] as $row) {
            $key = $row['question_key'];
            if (isset($keys[$key])) {
                $duplicates[$key] = true;
            } $keys[$key] = true;
        }
        foreach ($sheets['Options'] ?? [] as $row) {
            $key = $row['question_key'];
            $groups[$key][] = $row;
            if (! isset($keys[$key])) {
                $errors[] = ['sheet' => 'Options', 'row' => $row['_row'], 'key' => $key, 'message' => 'Unknown question_key. This option row will be skipped.'];
            }
        }
        $valid = [];
        $preview = [];
        foreach ($sheets['Questions'] as $row) {
            $key = $row['question_key'];
            $rowErrors = [];
            $options = [];
            $error = fn ($message) => ['sheet' => 'Questions', 'row' => $row['_row'], 'key' => $key, 'message' => $message];
            if ($key === '') {
                $rowErrors[] = $error('question_key is required.');
            }
            if (isset($duplicates[$key])) {
                $rowErrors[] = $error('Duplicate question_key. All rows with this key will be skipped.');
            }
            foreach ($groups[$key] ?? [] as $o) {
                if (! in_array($o['is_correct'], ['0', '1'], true)) {
                    $rowErrors[] = ['sheet' => 'Options', 'row' => $o['_row'], 'key' => $key, 'message' => 'is_correct must be 0 or 1.'];
                }
                if (! ctype_digit($o['sort_order'])) {
                    $rowErrors[] = ['sheet' => 'Options', 'row' => $o['_row'], 'key' => $key, 'message' => 'sort_order must be a nonnegative integer.'];
                }
                $options[] = ['sort_order' => $o['sort_order'], 'option_text' => $o['option_text'], 'is_correct' => $o['is_correct']];
            }
            $subject = $row['subject'] !== '' ? Subject::where('name', $row['subject'])->first() : null;
            if (! $subject && $row['subject'] !== '' && ! $r->boolean('create_subjects')) {
                $rowErrors[] = $error('Unknown subject. Enable creation of unknown subjects or leave subject blank.');
            }
            if (mb_strlen($row['subject']) > 150) {
                $rowErrors[] = $error('Subject must be at most 150 characters.');
            }
            $data = ['question_type' => $row['question_type'] ?: 'single_choice', 'subject_id' => $subject?->id, 'question_text' => $row['question'], 'explanation' => $row['explanation'] ?: null, 'status' => $row['status'] ?: 'draft', 'options' => $options];
            try {
                $data = $service->validate($data);
            } catch (ValidationException $e) {
                foreach ($e->errors() as $messages) {
                    foreach ($messages as $message) {
                        $rowErrors[] = $error($message);
                    }
                }
            }
            $errors = array_merge($errors, $rowErrors);
            $preview[] = ['key' => $key, 'question_text' => $row['question'], 'question_type' => $data['question_type'], 'subject' => $row['subject'] ?: 'Uncategorized', 'option_count' => count($options), 'valid' => ! $rowErrors];
            if (! $rowErrors) {
                $valid[] = $data + ['_subject_name' => $row['subject']];
            }
        }
        $payload = ['valid' => $valid, 'errors' => $errors, 'preview' => $preview, 'skipped' => count($sheets['Questions']) - count($valid)];
        $id = (string) Str::uuid();
        DB::table('question_imports')->insert(['id' => $id, 'user_id' => $r->user()->id, 'payload' => json_encode($payload), 'expires_at' => now()->addHour(), 'created_at' => now(), 'updated_at' => now()]);

        return ['id' => $id, 'valid_count' => count($valid), 'skipped_count' => $payload['skipped'], 'errors' => $errors, 'preview' => $preview];
    }

    public function confirm(Request $r, string $import, QuestionService $service)
    {
        $r->validate(['skip_invalid' => 'required|boolean']);

        return DB::transaction(function () use ($r, $import, $service) {
            $batch = DB::table('question_imports')->where('id', $import)->lockForUpdate()->first();
            abort_unless($batch && $batch->user_id === $r->user()->id, 404);
            abort_if($batch->confirmed_at, 409, 'This import has already been confirmed.');
            abort_if(now()->gte($batch->expires_at), 410, 'The preview expired. Upload the workbook again.');
            $payload = json_decode($batch->payload, true);
            abort_if(count($payload['errors']) && ! $r->boolean('skip_invalid'), 422, 'Fix the errors or choose to import valid questions only.');
            abort_if(! count($payload['valid']), 422, 'No valid questions to import.');
            foreach ($payload['valid'] as $data) {
                $name = $data['_subject_name'];
                unset($data['_subject_name']);
                if ($name !== '') {
                    $data['subject_id'] = Subject::firstOrCreate(['name' => $name], ['slug' => Str::slug($name).'-'.substr(sha1($name), 0, 8), 'status' => 'active'])->id;
                }
                $service->save($data);
            }
            DB::table('question_imports')->where('id', $import)->update(['confirmed_at' => now(), 'updated_at' => now()]);

            return ['imported' => count($payload['valid']), 'skipped' => $payload['skipped']];
        }, 3);
    }
}
