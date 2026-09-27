import { test, expect } from '@playwright/test';

async function register(page) {
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Dr. Browser Test');
  await page
    .getByLabel('Email address')
    .fill(`browser-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('BrowserTest2026!');
  await page.getByLabel('Confirm password').fill('BrowserTest2026!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Welcome back, Browser.' })).toBeVisible();
}
async function loginAdmin(page) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('admin@example.com');
  await page.getByLabel('Password', { exact: true }).fill('AdminDemo2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
async function enrollPrimary(page) {
  await page.goto('/courses/mrcem-primary');
  await page.getByRole('button', { name: 'Enroll for free' }).click();
  await expect(page.getByText('You’re enrolled', { exact: true })).toBeVisible();
}
test('public catalogue, search, course information and mobile layout', async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'MRCEM Exam Preparation' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'MRCEM Primary', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('home-desktop.png'), fullPage: true });
  await page.goto('/courses');
  await page.getByPlaceholder('Find your course…').fill('Emergency');
  await expect(page.locator('.course-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Emergency Essentials' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect.poll(() => page.locator('.course-card').count()).toBeGreaterThanOrEqual(3);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'MRCEM Exam Preparation' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('home-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.getByRole('link', { name: 'Our courses' }).click();
  await expect(page).toHaveURL(/\/courses$/);
  expect(errors).toEqual([]);
});
test('doctor registers, enrolls, resumes persisted exam and receives result', async ({
  page,
}, testInfo) => {
  await register(page);
  await enrollPrimary(page);
  await page.getByRole('link', { name: 'View exam' }).first().click();
  const startResponse = page.waitForResponse(
    (r) => r.url().endsWith('/start') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Begin exam' }).click();
  const attempt = await (await startResponse).json();
  expect(JSON.stringify(attempt)).not.toContain('is_correct');
  expect(JSON.stringify(attempt)).not.toContain('explanation');
  await expect(page.getByRole('heading', { name: 'Foundation check' })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByText('Right ventricle', { exact: true }).click();
  await expect(page.getByText('All answers saved')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('exam-desktop.png'), fullPage: true });
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/attempts/${attempt.id}$`));
  await page.getByRole('button', { name: 'Go to prompt 2', exact: true }).click();
  await expect(page.getByRole('radio', { name: /Right ventricle/ })).toBeChecked();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByText('Sinoatrial node', { exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByText('Abducens nerve', { exact: true }).click();
  await page.getByRole('button', { name: 'Review & submit' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit exam', exact: true }).click();
  await expect(page).toHaveURL(/\/result$/);
  await expect(page.getByText('Pass mark reached')).toBeVisible();
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('result-desktop.png'), fullPage: true });
  await page.goto('/dashboard');
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.locator('.sidebar').evaluate((el) => el.getBoundingClientRect().right))
    .toBeLessThanOrEqual(0);
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile.png'), fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
});
test('admin creates an uncategorized draft and adds, reorders and removes options', async ({
  page,
}, testInfo) => {
  await loginAdmin(page);
  await page.goto('/admin/questions');
  await page.getByRole('button', { name: 'Add question', exact: true }).click();
  const text = `Browser draft ${Date.now()}`;
  await page.getByLabel('Question text').fill(text);
  await page.getByRole('button', { name: 'Save question' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByPlaceholder('Search questions…').fill(text);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.getByText('Uncategorized', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Edit questions' }).click();
  for (let i = 1; i <= 6; i++) {
    await page.getByRole('button', { name: 'Add option', exact: true }).click();
    await page.getByRole('textbox', { name: `Option ${i} text`, exact: true }).fill(`Answer ${i}`);
  }
  await page.getByRole('radio', { name: 'Option 6 is correct', exact: true }).check();
  await page.getByRole('button', { name: 'Move option 6 up', exact: true }).click();
  await page.getByRole('button', { name: 'Remove option 1', exact: true }).click();
  await page.getByLabel('Status', { exact: true }).selectOption('published');
  await page.screenshot({ path: testInfo.outputPath('question-editor.png'), fullPage: true });
  await page.getByRole('button', { name: 'Save question' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByText('5 options')).toBeVisible();
  await expect(page.getByText('Published', { exact: true })).toBeVisible();
});
test('Excel template round-trips through preview and confirmation', async ({ page }, testInfo) => {
  await loginAdmin(page);
  await page.goto('/admin/questions/import');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download template' }).click();
  const download = await downloadPromise;
  const file = testInfo.outputPath('template.xlsx');
  await download.saveAs(file);
  await page.getByLabel('Excel workbook (.xlsx)').setInputFiles(file);
  await page.getByRole('button', { name: 'Preview import' }).click();
  await expect(page.getByRole('heading', { name: 'Check your preview' })).toBeVisible();
  await expect(page.getByText('4 valid', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm 4 questions' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Imported 4 questions.' })).toBeVisible();
});
test('written response remains provisional until admin grading', async ({ page, browser }) => {
  await register(page);
  await enrollPrimary(page);
  await page.getByRole('link', { name: 'View exam' }).nth(2).click();
  await page.getByRole('button', { name: 'Begin exam' }).click();
  await expect(page).toHaveURL(/\/attempts\/\d+$/);
  const attemptId = page.url().split('/').pop();
  await page.getByText('Sinoatrial node', { exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByText('Artery', { exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Your response', exact: true })
    .fill('The SA node normally initiates the cardiac impulse.');
  await expect(page.getByText('All answers saved')).toBeVisible();
  await page.getByRole('button', { name: 'Review & submit' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit exam', exact: true }).click();
  await expect(page.getByText('Manual review pending')).toBeVisible();
  const context = await browser.newContext();
  const admin = await context.newPage();
  await loginAdmin(admin);
  await admin.goto(`/admin/results/${attemptId}`);
  await admin.getByLabel('Awarded marks (out of 3)').fill('2.5');
  await admin.getByLabel('Feedback (optional)').fill('Clear explanation.');
  await admin.getByRole('button', { name: 'Save grade', exact: true }).click();
  await expect(admin.getByRole('button', { name: 'Update grade', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('90%', { exact: true })).toBeVisible();
  await expect(page.getByText('Clear explanation.', { exact: true })).toBeVisible();
  await context.close();
});

test('admin creates and publishes a course and assigns questions to its exam', async ({ page }) => {
  await loginAdmin(page);
  const suffix = Date.now();
  const title = `Browser course ${suffix}`;
  await page.goto('/admin/courses');
  await page.getByRole('button', { name: 'Add course', exact: true }).click();
  await page.getByLabel('Course title').fill(title);
  await page.getByLabel('URL slug', { exact: true }).fill(`browser-course-${suffix}`);
  await page.getByLabel('Short description').fill('A browser-tested demonstration course.');
  await page
    .getByLabel('Full description')
    .fill('Created to verify the administrator course and exam workflow.');
  await page.getByLabel('Status', { exact: true }).selectOption('published');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/admin/exams');
  await page.getByRole('button', { name: 'Add exam', exact: true }).click();
  await page.getByLabel('Exam title').fill(`Browser exam ${suffix}`);
  await page.getByLabel('Course', { exact: true }).selectOption({ label: title });
  await page.getByLabel('Duration (minutes)').fill('5');
  await page.getByLabel('Pass mark', { exact: true }).fill('1');
  await page.getByPlaceholder('Search question bank…').fill('Which organ produces insulin?');
  await expect(page.locator('.bank-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Marks for question 1').fill('2');
  await page.getByLabel('Exam status').selectOption('published');
  await page.getByRole('button', { name: 'Save exam', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto(`/courses/browser-course-${suffix}`);
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: `Browser exam ${suffix}`, exact: true }),
  ).toBeVisible();
});

test('paid enrollment stays pending until payment approval', async ({ page, browser }) => {
  await register(page);
  await page.goto('/courses/mrcem-sba');
  await page.getByRole('button', { name: 'Submit payment', exact: true }).click();
  const reference = `BROWSER-${Date.now()}`;
  await page.getByLabel('Transaction reference').fill(reference);
  await page
    .getByLabel('Payment date')
    .fill(new Date(Date.now() - 86400000).toISOString().slice(0, 10));
  await page.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(page.getByText('Your payment is awaiting approval.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View exam' })).toHaveCount(0);
  const context = await browser.newContext();
  const admin = await context.newPage();
  await loginAdmin(admin);
  await admin.goto('/admin/payments');
  await admin.getByPlaceholder('Search payments…').fill(reference);
  await expect(admin.locator('tbody tr')).toHaveCount(1);
  await admin.getByRole('button', { name: 'Edit payments', exact: true }).click();
  await admin.getByLabel('Review note').fill('Demo payment verified in browser test.');
  await admin.getByLabel('Review decision').selectOption('approved');
  await admin.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(admin.getByRole('dialog')).not.toBeVisible();
  await expect(admin.getByRole('table').getByText('Approved', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('You’re enrolled', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View exam' })).toBeVisible();
  await context.close();
});
