# API and data notes

All URLs below are relative to `/api`. Responses are JSON. Validation errors return HTTP 422 with field errors; authorization returns 401/403; ended attempts and used attempt limits return 409. Public courses include published entries only.

| Area | Endpoints |
| --- | --- |
| Authentication | `POST auth/register`, `POST auth/login`, `POST auth/logout`, `GET auth/user` |
| Account | `PUT auth/profile`, `PUT auth/password`, `POST auth/forgot-password`, `POST auth/reset-password` |
| Courses | `GET courses`, `GET courses/{slug}`, `POST courses/{id}/enroll`, `GET my-courses` |
| Workspace | `GET dashboard`, `GET my-attempts`, `GET my-payments`, `GET settings` |
| Exam | `GET exams/{id}`, `POST exams/{id}/start` |
| Attempt | `GET exam-attempts/{id}`, `PUT exam-attempts/{id}/answer`, `POST exam-attempts/{id}/submit`, `GET exam-attempts/{id}/result` |
| Payments | `POST courses/{id}/payments` |
| Admin management | `GET/POST admin/courses`, `admin/exams`, `admin/questions`, `admin/subjects`; `PUT/DELETE .../{id}` |
| Admin review | `GET admin/users`, `admin/enrollments`, `admin/payments`, `admin/results`; account/enrollment/payment status via `PUT .../{id}` |
| Admin detail | `GET admin/users/{id}`, `GET admin/exams/{id}`, `GET admin/results/{attempt}` |
| Manual grade | `PUT admin/results/{attempt}/grade/{question}` with `marks_awarded`, optional `feedback` |
| Excel | `GET admin/question-import/template`, `POST admin/question-import/preview`, `POST admin/question-import/{uuid}/confirm` |
| Settings | `PUT admin/settings` with `payment_instructions` |

## Authentication

Use the configured SPA origin, get `/sanctum/csrf-cookie` before login, and send session cookies plus XSRF headers for writes. Admin routes additionally require an active administrator. Inactive doctors lose access to protected routes. Password resets and account deactivation revoke stored sessions.

## Question validation

`subject_id` is nullable. Question types: `single_choice`, `text_response`, `information`. `options` is an array (possibly empty) of `{option_text, sort_order, is_correct}`. Its length has no fixed A–E limit. Published single-choice questions require at least two nonempty options and exactly one correct flag; sort orders must be distinct. Non-choice types reject option rows. Draft single-choice questions may be incomplete. Questions used in published exams must remain publishable.

## Attempt consistency

Starting locks the user's record and exam in a MySQL transaction to serialize starts and enforce attempt limits. The existing in-progress attempt is returned on resume. Each attempt captures the exam settings, question text, option IDs/order, explanations and scoring in a private snapshot. Active API responses explicitly allowlist safe fields and never serialize the private snapshot, correctness or explanations.

`expires_at` is authoritative. Answer updates and submission lock the attempt record and check state under that lock. Late answers are rejected and the expiry result is committed. Submission is idempotent. Old option IDs are validated against the snapshot, not mutable question-bank records.

Information prompts do not receive answer rows or count as scored questions. Every written-response prompt stays pending until an administrator grades it, including unanswered written prompts. Written responses never contribute to the automatic correct/incorrect choice counts. Unanswered counts use empty responses across all answerable questions. Negative choice marks can make the total score negative; scores are not silently clamped. Percentage and pass/fail remain null while any grading is pending.

Result and answer-review visibility are snapshotted when an attempt starts. Hidden scores stay hidden in the result endpoint, doctor dashboard and attempt history. Admins can review completed attempts regardless of doctor-facing visibility.

## Retention and imports

Courses, exams and questions are soft-deleted. History and payments use restrictive foreign keys. Option records can be replaced because every attempt retains an immutable copy; attempt answer IDs deliberately refer to that copy. Subject deletion nulls question classification.

Workbook previews are stored server-side for one hour, linked to their administrator, and confirmed once within a transaction. Clients cannot alter the preview payload. Duplicate question keys invalidate every question with that key. Invalid option flags, sort orders and contradictory question types invalidate the whole owning question. Orphan option rows are reported. Confirming valid rows requires an explicit skip choice whenever errors exist.
