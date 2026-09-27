# cPanel deployment

## 1. API files and MySQL

1. Select PHP **8.3 or newer**. Enable PDO MySQL, mbstring, fileinfo, DOM, XML/XMLReader, cURL and Zip. Verify Composer's platform requirements on the actual host.
2. Create a cPanel MySQL database and database user. Grant the user access to that database.
3. Upload `backend/` outside the public website folder, for example `/home/ACCOUNT/mission-api/`. Install production dependencies using `composer install --no-dev --optimize-autoloader`.
4. Point the `api.missionmrcem.com` subdomain document root to `/home/ACCOUNT/mission-api/public`. Never expose the Laravel project root.
5. Copy `.env.production.example` to `.env` and replace the database, domain and SMTP placeholders. Keep this file private.
6. Run:

```bash
php artisan key:generate
php artisan migrate --force
php artisan app:create-admin admin@your-domain.com --name="Your Administrator"
php artisan optimize
composer check-platform-reqs --no-dev
```

The administrator command prompts for a password without echoing it or placing it in shell history. Do not deploy the local demo database/accounts. Ensure `storage/` and `bootstrap/cache/` are writable by PHP.

## 2. React JavaScript frontend

In `frontend/.env.production`:

```env
VITE_API_URL=https://api.missionmrcem.com
```

Build:

```bash
npm ci
npm run build
```

Upload **the contents of `frontend/dist/`**, including its hidden `.htaccess`, into the main domain's `public_html`. Do not upload `src/` or `node_modules/`. No Node server is needed in production. Apache must allow rewrite rules so refreshing `/dashboard` or `/attempts/123` loads `index.html`.

## 3. Session authentication across subdomains

Keep frontend and API on the same parent domain with HTTPS enabled on both. Backend configuration for the proposed domains:

```env
APP_URL=https://api.missionmrcem.com
FRONTEND_URL=https://missionmrcem.com
SANCTUM_STATEFUL_DOMAINS=missionmrcem.com
SESSION_DOMAIN=.missionmrcem.com
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
```

The React client obtains `/sanctum/csrf-cookie`, sends cookies and the `X-XSRF-TOKEN` header. Authentication tokens are not kept in localStorage. CORS permits only configured frontend origins with credentials. Choose a canonical frontend hostname; if using `www`, update the configuration consistently. After any backend environment change, run `php artisan optimize:clear` then `php artisan optimize`.

Reference: [Laravel 12 Sanctum SPA authentication](https://laravel.com/docs/12.x/sanctum#spa-authentication).

## 4. Timer scheduler

Add this cron job to cPanel (replace account and PHP executable as needed):

```cron
* * * * * cd /home/ACCOUNT/mission-api && /usr/local/bin/php artisan schedule:run >> /dev/null 2>&1
```

The scheduler finalizes unattended attempts every minute. The API rejects late answers immediately using the server deadline, even between cron runs. Opening an expired attempt also finalizes it. Keep the server clock synchronized and PHP/app time in UTC; the frontend displays dates locally.

## 5. Mail and course content

Configure a working SMTP account and test forgot/reset password delivery. Configure payment instructions in Admin → Settings. Add verified questions/courses/exams and publish them. Demo payment verification does not communicate with a bank or payment gateway; administrators must verify the transaction before approving it.

## 6. Verify on the real host

- Register, sign out and sign back in; confirm secure cookies and no CORS/CSRF errors.
- Enroll in a free course; verify access is denied to an unenrolled account.
- Start an exam, refresh, resume and let a short test attempt expire.
- Submit and manually grade a written response. Confirm the final result updates.
- Submit a test payment and approve it as an administrator.
- Download/import the Excel template, then refresh a nested frontend URL.
- Configure database backups and verify cron is running.

The local automated tests do not establish that a particular cPanel account, SMTP provider or live domain is configured correctly; perform these host-specific checks after deployment.
