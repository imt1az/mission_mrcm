# Mission MRCEM — Project Context for ChatGPT

এই ফাইলটি ChatGPT-তে আপলোড করলে প্রজেক্টের কাঠামো ও বর্তমান কাজের প্রেক্ষাপট বোঝা যাবে। এটি source code-এর বিকল্প নয়; কোনো পরিবর্তনের জন্য সংশ্লিষ্ট ফাইলও দিতে হবে।

Last updated: 28 September 2026. This describes the current local implementation, not a production deployment.

## 1. Project overview

Mission MRCEM is a course-based examination platform for doctors preparing for MRCEM. It has a public website, a student/doctor workspace and an administrator workspace.

The product name is Mission MRCEM. The supplied visual logo reads **Hamed — Critical & Emergency Medicine**. The mentor is Dr Abdul Hamed.

### Technology

| Layer | Implementation |
| --- | --- |
| Frontend | React 19, JavaScript / JSX, Vite 6 |
| Routing | React Router 7 |
| Styling | Custom CSS with Tailwind CSS 4 tooling; Lucide React icons |
| API client | Axios, shared `useResource` hook |
| Backend | Laravel 12, PHP; local setup requires PHP 8.3+ for locked dependencies |
| Authentication | Laravel Sanctum cookie/session authentication and CSRF protection |
| Database | MySQL |
| Excel import | OpenSpout |
| Tests | PHPUnit/Laravel feature tests, Playwright with Chrome, ESLint |
| Local environment | Windows, Laragon, PowerShell |

**Use JavaScript/JSX, not TypeScript. Keep MySQL.** The backend is PHP/Laravel, not a Node.js backend.

## 2. Repository structure

```text
MissionMrcm/
├── PROJECT_CONTEXT.md              # This handover document
├── README.md                       # Setup and feature overview
├── backend/
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── AuthController.php
│   │   │   │   ├── LearningController.php
│   │   │   │   ├── AdminController.php
│   │   │   │   ├── ResultBrowserController.php
│   │   │   │   └── ImportController.php
│   │   │   ├── Middleware/
│   │   │   │   ├── EnsureAdmin.php
│   │   │   │   └── EnsureActive.php
│   │   │   └── Requests/ExamRequest.php
│   │   ├── Models/
│   │   └── Services/
│   │       ├── ExamService.php
│   │       └── QuestionService.php
│   ├── database/
│   │   ├── migrations/
│   │   ├── factories/
│   │   └── seeders/
│   ├── routes/
│   │   ├── api.php
│   │   └── console.php
│   ├── tests/Feature/PlatformTest.php
│   ├── phpunit.xml
│   ├── composer.json
│   └── .env                        # Local configuration; not for sharing
├── frontend/
│   ├── public/images/
│   │   ├── hamed-logo.png
│   │   └── dr-abdul-hamed-mrcem.jpg
│   ├── src/
│   │   ├── main.jsx                 # Entry point and stylesheet order
│   │   ├── App.jsx                  # Routes, route layouts, error boundary
│   │   ├── context/AuthContext.jsx
│   │   ├── lib/
│   │   │   ├── api.js               # Axios, CSRF, resources, format helpers
│   │   │   └── courseTheme.js       # Stable course colour variables by ID
│   │   ├── components/
│   │   │   ├── UI.jsx               # Brand, CourseCard, Field, badges, etc.
│   │   │   ├── Layout.jsx           # Public/student/admin layouts and guards
│   │   │   ├── Modal.jsx            # Shared native dialog
│   │   │   ├── HomeHero.jsx
│   │   │   ├── MentorSection.jsx
│   │   │   └── SiteFooter.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Auth.jsx
│   │   │   ├── Learning.jsx
│   │   │   ├── ExamRoom.jsx
│   │   │   └── ExamResult.jsx
│   │   ├── admin/
│   │   │   ├── Admin.jsx
│   │   │   └── AdminResults.jsx
│   │   ├── styles.css
│   │   ├── public-site.css
│   │   ├── learning-theme.css
│   │   ├── admin-theme.css
│   │   ├── result-theme.css
│   │   ├── browse-theme.css
│   │   └── home-motion.css
│   ├── tests/
│   │   ├── platform.spec.js
│   │   └── browse.spec.js
│   ├── playwright.config.js
│   ├── vite.config.js
│   ├── package.json
│   └── dist/                       # Generated production build
├── scripts/                        # Local start/stop scripts
├── docs/
│   ├── API.md
│   ├── CPANEL.md
│   ├── VALIDATION.md
│   └── screenshots/
└── .runtime/                       # Temporary local checks, scripts and logs
```

This tree highlights the relevant files rather than every framework file. Do not edit `vendor`, `node_modules` or generated `dist` files to implement features.

## 3. Where to make changes

| Task | Main files |
| --- | --- |
| Homepage content and scroll animations | `frontend/src/pages/Home.jsx` |
| Homepage hero | `frontend/src/components/HomeHero.jsx` |
| Logo everywhere | `Brand` in `frontend/src/components/UI.jsx`, `home-motion.css` |
| Header, sidebar and route protection | `frontend/src/components/Layout.jsx` |
| Mentor, video and footer | `MentorSection.jsx`, `SiteFooter.jsx` |
| Course cards | `CourseCard` in `UI.jsx`, `courseTheme.js`, `learning-theme.css` |
| Course catalogue and details | `Courses`, `CourseDetails` in `pages/Learning.jsx` |
| Student dashboard, history, profile, payments | Other exports in `pages/Learning.jsx` |
| Exam-taking screen | `pages/ExamRoom.jsx` |
| Individual result and written-answer grading UI | `pages/ExamResult.jsx` |
| Admin lists, course/exam/question editors, import/settings | `admin/Admin.jsx` |
| Course → exam → student results browser | `admin/AdminResults.jsx` |
| Reusable form modal | `components/Modal.jsx` |
| Public/student API actions | `LearningController.php` |
| Admin CRUD and payment review | `AdminController.php` |
| Result grouping, filtering and summaries | `ResultBrowserController.php` |
| Timer, access, snapshots, answers and scoring | `ExamService.php` |
| Question validation and persistence | `QuestionService.php` |
| Database schema | `backend/database/migrations/` |

`Learning.jsx` and `Admin.jsx` each contain multiple exported pages/components. Do not assume there is a separate file for every route.

### Stylesheet loading order

`main.jsx` imports these in order:

```text
styles.css → public-site.css → learning-theme.css → admin-theme.css
→ result-theme.css → browse-theme.css → home-motion.css
```

Later styles may override earlier ones, subject to selector specificity. Check the existing rules before adding another override. Scope changes to `.public-app`, `.student-workspace`, `.admin-workspace` or the relevant page where appropriate.

## 4. Frontend routes

| Area | Routes |
| --- | --- |
| Public | `/`, `/courses`, `/courses/:slug` |
| Authentication | `/login`, `/register`, `/forgot-password`, `/reset-password` |
| Student | `/dashboard`, `/my-courses`, `/results`, `/profile`, `/payments` |
| Exam | `/exams/:id`, `/exams/:id/start`, `/attempts/:id`, `/attempts/:id/result` |
| Admin overview | `/admin` |
| Admin management | `/admin/courses`, `/admin/exams`, `/admin/questions`, `/admin/subjects`, `/admin/users`, `/admin/enrollments`, `/admin/payments` |
| Admin results | `/admin/results`, `/admin/results/:id` |
| Import/settings | `/admin/questions/import`, `/admin/settings` |

Admin results use query parameters for the hierarchy:

```text
/admin/results
    Course list
/admin/results?course_id=6
    Exams within a course
/admin/results?course_id=6&exam_id=10&exam_title=Example
    Students' attempts for that exam
/admin/results?view=all
    All student attempts
```

Results filters include search, status, pending grading, date range, sorting and pagination. The review link preserves the filtered list in router state so the user can return to it.

## 5. API and authentication

The definitive route definitions are in `backend/routes/api.php`. All API paths below have an `/api` prefix.

- Public: `GET /courses`, `GET /courses/{slug}`, `GET /settings`.
- Auth: registration, login, logout, user session, profile/password changes, forgot/reset password under `/auth`.
- Student: `/dashboard`, `/my-courses`, `/my-payments`, `/my-attempts`.
- Enrollment: `POST /courses/{course}/enroll` for free courses; `POST /courses/{course}/payments` for paid courses.
- Exams: `GET /exams/{exam}`, `POST /exams/{exam}/start`.
- Attempts: `GET /exam-attempts/{attempt}`, answer updates, submission and result endpoints.
- Admin: CRUD and review endpoints under `/admin`, protected by authenticated, active-account and administrator checks.
- Results browser: `GET /admin/result-courses`, `/admin/result-exams`, `/admin/results`, `/admin/filter-options`.
- Individual review: `GET /admin/results/{attempt}` and `PUT /admin/results/{attempt}/grade/{question}`.

The frontend uses Axios with credentials and XSRF support. CSRF initialization uses `/sanctum/csrf-cookie`. Vite proxies `/api` and `/sanctum` to `http://127.0.0.1:8000`. `VITE_API_URL` can set an API origin when necessary.

Use the existing auth flow. Role values are `doctor` and `admin`. A doctor may only access their own attempts; an administrator has separate result-review endpoints. Passwords are hashed, not stored as readable plaintext.

API response shapes differ: many admin lists are paginated objects with `data`, while subjects and personal enrollment/payment lists return arrays. Inspect the relevant controller before consuming a response.

## 6. Database structure

Main tables and relationships:

| Table | Purpose / relationships |
| --- | --- |
| `users` | Accounts, roles and account status |
| `courses` | Course title, slug, description, free/paid type, price, publication status |
| `course_enrollments` | User ↔ course access, enrollment status and expiry |
| `exams` | Belongs to course; timing, marks, attempts, visibility and publication settings |
| `subjects` | Optional question categories |
| `questions` | Shared question bank; optional subject |
| `question_options` | Choice options belonging to a question |
| `exam_questions` | Exam ↔ question assignments, marks and order |
| `exam_attempts` | User's exam session, timestamps, status, score and immutable snapshot |
| `attempt_answers` | Submitted answers, grading state, marks and feedback |
| `payments` | Course payment reference, method, amount and review status |
| `question_imports` | Excel import preview/confirmation state |
| `settings` | Platform settings such as payment instructions |

Laravel infrastructure tables also exist for sessions, tokens, cache, jobs and password resets. Refer to migrations for exact column types and indexes.

Courses and exams support soft deletion. Historical results can still reference archived courses/exams. The result browser includes archived history.

## 7. Main workflows and business rules

### Courses and enrollment

- Only published courses appear in the public catalogue.
- Newest published courses appear first by default. Catalogue sorting also supports oldest, title and price.
- Course creation closes the editor and clears list filters/page so the new record can be seen.
- Free courses support authenticated enrollment.
- Paid courses use a manual payment submission modal. This is not an integrated payment gateway.
- Admin approval activates paid enrollment; rejection records the review outcome.
- Active enrollment and expiry determine course/exam access.

### Exams and results

- Question types: `single_choice`, `text_response`, `information`.
- Information items are not scored and do not require an answer; UI terminology uses “question”, not “prompt”.
- Exams support configurable marks, negative marking, attempt limits, shuffling and result/answer visibility.
- The backend controls deadlines. Refreshing or closing the browser does not reset the timer.
- Answers autosave. Submission is idempotent.
- Existing attempts use stored snapshots; later edits to questions/options/exams do not rewrite historical scoring.
- Choice answers are automatically scored. Written answers require administrator grading.
- Scores can be provisional while grading remains pending. Final pass status is withheld until grading is complete.
- Student history must respect hidden-result settings; do not expose hidden scores through summaries or filters.
- The scheduler finalizes expired attempts. `exams:expire` runs every minute through Laravel scheduling.

### Administration

- Course/exam/question/subject management, account status, enrollment review and payment approval.
- Excel template, import preview and confirmation workflow.
- Result browsing follows course list → exams → student results, with manual grading and filters.
- Useful search/status/type/course filters are present on relevant admin and student lists.

## 8. Current UI preferences and recent changes

These reflect the owner's expressed preferences:

- Preserve the blue/teal visual direction, especially the homepage hero.
- Use colourful course cards and clear, darker/bolder text with readable contrast.
- Keep borders minimal. Prefer spacing, background colours and subtle shadows to heavy outlines.
- Avoid unnecessary filler text.
- Use “Question/Questions” in the interface instead of “Prompt/Prompts”.
- Course colour comes from its ID through `courseTheme.js`, so sorting/filtering does not change its colour.
- In admin results, courses appear as a vertical list. Clicking one opens its exams.
- On the course details page, **Practice exams appears before About this course**. On mobile the exam section also appears before the enrollment card.
- Use the shared modal for admin editors, paid-course payment and profile forms. Payment errors remain inside the dialog.
- `Modal.jsx` uses native `<dialog>`, body scroll locking, Escape handling, focus restoration and a busy guard.
- The supplied logo is `frontend/public/images/hamed-logo.png`, rendered by `Brand` in `UI.jsx`. CSS trims the original image's surrounding whitespace visually.
- Homepage animations: hero entrance, gentle artwork motion, section reveal on scroll, button/card hover effects. Respect `prefers-reduced-motion`.
- The mentor image is `frontend/public/images/dr-abdul-hamed-mrcem.jpg`.
- Mentor content, introduction video and footer contact details already exist; preserve them unless a requested change concerns them.

## 9. Local development

```text
Project root: C:\laragon\www\MissionMrcm
Frontend:     http://127.0.0.1:5173
Backend:      http://127.0.0.1:8000
API:          http://127.0.0.1:8000/api
Database:     mission_mrcem (MySQL, local port 3306)
Test DB:      mission_mrcem_test
```

Database credentials remain in `backend/.env`; they are intentionally not copied into this shareable document.

Start MySQL in Laragon, then from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-dev.ps1
```

Or use separate terminals:

```powershell
# Backend
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

```powershell
# Frontend, from the project root
cd frontend
npm.cmd run dev
```

```powershell
# Scheduler, from the project root
cd backend
php artisan schedule:work
```

Use `127.0.0.1` consistently to avoid cookie/session host mismatches. For fresh installation, dependencies and deployment, consult `README.md` and `docs/CPANEL.md`. Do not rerun demo seeders on an existing database just to start the app; they can restore sample data and assignments.

## 10. Validation and limits

```powershell
# From backend/
php artisan test
php vendor/bin/pint --test

# From frontend/
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e -- tests/browse.spec.js
```

- PHPUnit is configured to use the separate MySQL database `mission_mrcem_test`. Tests rebuild the test database; never place real data there.
- `browse.spec.js` checks course creation, result navigation/filter retention, payment modals, stable course colours and profile editing with mocked API data.
- The older `platform.spec.js` contains live integration flows and can create local records. Read it before running it against an existing database.
- The most recent full backend run during these changes passed 26 tests with 179 assertions. The five browser tests in `browse.spec.js` passed at that point. Later UI edits passed lint/build and targeted browser layout checks; not every test suite was rerun after every visual edit.
- The demo admin credentials in the original README did not authenticate during an earlier UI check. Do not assume those credentials still work or reset an account without authorization.
- Some screenshot/check scripts use isolated API fixtures. Their screenshots verify presentation, not live production data.
- External production deployment has not been verified in this work. See `docs/CPANEL.md` for deployment instructions.

## 11. How to share this with ChatGPT

Upload this file, then describe the change you want. Example:

> এই PROJECT_CONTEXT.md আমার বর্তমান Mission MRCEM প্রজেক্টের context। আগে কাঠামোটি বুঝে নাও। Frontend React JavaScript/JSX, backend Laravel এবং database MySQL। আমার নতুন কাজ: [এখানে কাজ লিখব]। বর্তমান blue/teal design, কম border, readable text ও mobile layout বজায় রাখবে। প্রয়োজন হলে কোন source file লাগবে নির্দিষ্ট করে বলবে। ফাইল না দেখে implementation সম্পর্কে অনুমানকে নিশ্চিত তথ্য হিসেবে বলবে না।

Useful accompanying files:

- Course page change: `Learning.jsx`, `UI.jsx`, `courseTheme.js`, relevant CSS.
- Admin results change: `AdminResults.jsx`, `ResultBrowserController.php`, `routes/api.php`.
- Exam behavior change: `ExamRoom.jsx`, `ExamResult.jsx`, `ExamService.php`, relevant models/tests.
- Logo/homepage change: `UI.jsx`, `Home.jsx`, `HomeHero.jsx`, `public-site.css`, `home-motion.css`.

Share source files and error messages as needed. Exclude `.env`, session cookies, access tokens, private database exports and real student records.
