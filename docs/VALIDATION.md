# Local validation

Validated on Windows / Laragon with PHP 8.3.20, MySQL 8.4.3, Node 22.14 and installed Google Chrome.

## Results

- Laravel API tests: **23 passed, 137 assertions**, using the separate `mission_mrcem_test` MySQL database.
- Browser workflows: **7 passed** (six in the full run, the payment test passed after its ambiguous test selector was corrected).
- JavaScript ESLint: passed with no warnings.
- PHP Pint: passed.
- Vite production build: passed; output in `frontend/dist/`, including `.htaccess`.
- All database migrations applied to local MySQL.
- Composer manifest and installed platform requirements validated.
- Local scheduler observed running `exams:expire` successfully every minute.

## Browser coverage

1. Public course browsing/search, desktop/mobile rendering and mobile navigation.
2. Registration, free enrollment, saved answers after refresh, submission and scoring.
3. Uncategorized draft creation, variable options, reorder/removal and publication.
4. Downloading the Excel template, upload preview and import confirmation.
5. Written responses remaining provisional until administrator grading.
6. Creating/publishing a course and assigning marked questions to a new exam.
7. Paid-course payment submission, administrator approval and access activation.

The PHP suite additionally checks authorization, inactive accounts, privilege injection, attempt ownership, enrollment, server deadlines, expiry scheduling, negative marking, hidden results, immutable historical snapshots, duplicate submissions, attempt limits, password resets, publication validation and malformed workbook rows.

Production domain routing, cPanel configuration, live SMTP delivery and real payment transactions require the actual hosting/account details and have not been tested in this workspace. See [CPANEL.md](CPANEL.md).
