# Mission MRCEM

A course-based examination platform for doctors, built with **Laravel 12 + React JavaScript/JSX + Vite + Tailwind CSS + MySQL**. The frontend and API are separate applications. There is no application TypeScript.

## Run locally in Laragon

The configured development URLs are:

- Frontend: **http://127.0.0.1:5173**
- API: **http://127.0.0.1:8000/api**
- MySQL database: **mission_mrcem**, local port **3306**
- Automated API tests: **mission_mrcem_test** (a separate MySQL database)

Start MySQL in Laragon, then run from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-dev.ps1
```

This starts the API, frontend and exam expiry scheduler in hidden background processes. To stop the processes started by the script:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/stop-dev.ps1
```

You can also use three terminals:

```powershell
# Terminal 1
cd backend
php artisan serve --host=127.0.0.1 --port=8000

# Terminal 2
cd frontend
npm run dev

# Terminal 3
cd backend
php artisan schedule:work
```

Use `127.0.0.1` consistently in the browser. Do not switch between `localhost` and `127.0.0.1` within a session.

## Development accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@example.com | AdminDemo2026! |
| Doctor | doctor@example.com | DoctorDemo2026! |

These are fake local accounts. The demo seeder refuses to run in production. The example questions demonstrate platform behavior and need content review before use as a real medical syllabus.

## Fresh installation

Requirements: PHP 8.3+ with PDO MySQL, mbstring, XML/XMLReader, DOM, fileinfo, cURL and Zip; Composer 2; Node.js 22.14+; MySQL 8. PHP 8.3+ is required by the locked Excel package.

Create the databases using HeidiSQL, phpMyAdmin or MySQL:

```sql
CREATE DATABASE mission_mrcem CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE mission_mrcem_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```powershell
cd backend
composer install
Copy-Item .env.example .env
# Set your MySQL credentials in .env.
php artisan key:generate
php artisan migrate --seed
cd ../frontend
npm ci
```

The demo seeder is repeatable, but also restores the sample exams' question assignments. Use it for development only.

## Included workflows

- Public course catalog with search and free/premium filtering; authenticated enrollment and course access.
- Registration, cookie-based Sanctum login/logout, profile/password changes, forgot/reset password, inactive account enforcement and role-protected administration.
- Free enrollment; manual payment submission, approval/rejection and paid-course activation. Set real payment instructions in **Admin → Settings**.
- Course, exam, question and optional subject management. Subjects can be deleted without removing questions; those questions become Uncategorized.
- Single-choice questions with any number of options, optional subjects, incomplete drafts, text responses and unscored information prompts.
- Option add/remove/reorder, exam question assignment/reorder, individual marks, attempt limits, question/option shuffle, negative marking and result visibility controls.
- Server-side deadlines, resuming the same attempt after refresh, answer autosave, question palette, flags for the current session, expiry submission and idempotent final submission.
- Immutable question/option/scoring snapshots. Editing or archiving the bank does not change existing attempts or results.
- Automatic choice scoring and administrator grading of written answers. Final percentage/pass status stays pending until every written answer has been graded.
- Two-sheet `.xlsx` template, row-specific preview errors and transactional import confirmation. Options sheet is optional; subjects can be created on request. Invalid questions can be skipped explicitly; their options are never imported on their own.
- Doctor attempt history and payment history; admin statistics, account status, enrollments, payments and grading.

## Validation

```powershell
cd backend
php artisan test --compact
php vendor/bin/pint --test

cd ../frontend
npm run lint
npm run build
# Keep the API and frontend running, with local demo data seeded.
npm run test:e2e
```

PHPUnit uses MySQL and forcibly selects `mission_mrcem_test`. `RefreshDatabase` rebuilds that test database; never put real data there. Browser tests use installed Chrome, generate clearly fake local accounts and add demonstration question records to the development database. Screenshots/traces are saved under `frontend/test-results/`.

`MAIL_MAILER=log` is used locally. Password reset links appear in `backend/storage/logs/laravel.log`. Configure SMTP for actual email delivery.

## Production

Follow [the cPanel deployment guide](docs/CPANEL.md). The static frontend build includes an Apache `.htaccess` route fallback. Production requires your domain, database and SMTP configuration, a real administrator and a minute-based cron job. This workspace has not been deployed to an external host.

See [the API and data notes](docs/API.md) for the endpoints and important behavior.
