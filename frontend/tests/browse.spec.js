import { test, expect } from '@playwright/test';

const courses = Array.from({ length: 6 }, (_, i) => ({
  id: i + 1,
  title: `Course ${i + 1}`,
  slug: `course-${i + 1}`,
  short_description: 'MRCEM exam preparation',
  description: 'Course material and practice exams.',
  course_type: i ? 'paid' : 'free',
  price: i ? 1200 : 0,
  status: 'published',
  exams_count: 1,
  enrollments_count: 2,
  attempts_count: 2,
}));
const exam = {
  id: 10,
  course_id: 6,
  title: 'Primary practice',
  status: 'published',
  attempts_count: 2,
  grading_count: 1,
};
const student = {
  id: 2,
  name: 'Dr Test',
  email: 'doctor@example.test',
  role: 'doctor',
  status: 'active',
};
const attempts = [
  {
    id: 20,
    user: student,
    exam,
    exam_title: exam.title,
    status: 'submitted',
    score: 3,
    total_marks: 5,
    percentage: 60,
    passed: null,
    correct_count: 1,
    wrong_count: 0,
    unanswered_count: 0,
    pending_count: 1,
    started_at: '2026-09-28T08:00:00Z',
    submitted_at: '2026-09-28T08:10:00Z',
  },
];
const pageData = (data) => ({ data, total: data.length, current_page: 1, last_page: 1 });

async function setup(page, role = 'admin') {
  let records = courses.map((c) => ({ ...c }));
  let paid = false;
  const calls = [];
  await page.route('**/sanctum/csrf-cookie', (route) => route.fulfill({ status: 204 }));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const p = url.pathname.replace('/api', '');
    calls.push({ path: p, query: url.searchParams, method: request.method() });
    let json;
    if (p === '/auth/user') json = { ...student, role };
    else if (p === '/admin/filter-options') json = { courses: records };
    else if (p === '/admin/courses' && request.method() === 'POST') {
      const course = { ...request.postDataJSON(), id: 9, exams_count: 0, enrollments_count: 0 };
      records.push(course);
      return route.fulfill({ status: 201, json: course });
    } else if (p === '/admin/courses' || p === '/courses' || p === '/admin/result-courses') {
      let data = records.filter((c) =>
        c.title.toLowerCase().includes((url.searchParams.get('search') || '').toLowerCase()),
      );
      if (url.searchParams.get('status'))
        data = data.filter((c) => c.status === url.searchParams.get('status'));
      if (url.searchParams.get('type'))
        data = data.filter((c) => c.course_type === url.searchParams.get('type'));
      data.sort((a, b) => (url.searchParams.get('sort') === 'oldest' ? a.id - b.id : b.id - a.id));
      json = pageData(data);
    } else if (p === '/admin/result-exams') json = pageData([exam]);
    else if (p === '/admin/results')
      json = {
        ...pageData(attempts),
        summary: { attempts: 1, students: 1, awaiting_grading: 1, completed: 1 },
      };
    else if (p === '/admin/results/20')
      json = {
        ...attempts[0],
        title: exam.title,
        result_visible: false,
        message: 'Preview result',
      };
    else if (p === '/courses/course-6') json = { ...courses[5], exams: [] };
    else if (p === '/my-courses')
      json = paid ? [{ id: 1, course: courses[5], status: 'pending' }] : [];
    else if (p === '/settings')
      json = { payment_instructions: 'Send payment and enter the transaction reference.' };
    else if (p === '/courses/6/payments') {
      if (request.postDataJSON().transaction_reference === 'DUPLICATE')
        return route.fulfill({
          status: 422,
          json: { message: 'This transaction reference has already been used.' },
        });
      paid = true;
      json = { id: 1, status: 'pending' };
    } else if (p === '/auth/profile') json = { ...student, ...request.postDataJSON() };
    else throw new Error(`Unexpected API request: ${p}`);
    return route.fulfill({ json });
  });
  return calls;
}

test('creating a course closes the dialog, clears filters and shows the newest course', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/admin/courses');
  await page.getByPlaceholder(/Search courses/).fill('Course 1');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Add course', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Create course' });
  await expect(modal).toBeVisible();
  await modal.getByLabel('Course title').fill('New published course');
  await modal.getByLabel('URL slug').fill('new-published-course');
  await modal.getByLabel('Short description').fill('Preparation');
  await modal.locator('[name="description"]').fill('Exam preparation');
  await modal.locator('[name="status"]').selectOption('published');
  await modal.getByRole('button', { name: 'Save changes' }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByPlaceholder(/Search courses/)).toHaveValue('');
  await expect(page.locator('tbody tr').first()).toContainText('New published course');
  await expect(page.getByText(/Course created/)).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/courses$/);
  await page.getByRole('button', { name: 'Add course', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add course', exact: true })).toBeFocused();
});

test('results drill down from course to exam and retain filters after reviewing', async ({
  page,
}) => {
  const calls = await setup(page);
  await page.goto('/admin/results');
  await page.locator('.result-browse-card').filter({ hasText: 'Course 6' }).click();
  await expect(page).toHaveURL(/course_id=6/);
  await page.locator('.result-browse-card').filter({ hasText: 'Primary practice' }).click();
  await expect(page.locator('tbody')).toContainText('doctor@example.test');
  await page.getByRole('checkbox', { name: 'Needs grading' }).click();
  await expect(page.getByRole('checkbox', { name: 'Needs grading' })).toBeChecked();
  await page.getByLabel('From date').fill('2026-09-01');
  await expect
    .poll(() =>
      calls.some(
        (c) =>
          c.path === '/admin/results' &&
          c.query.get('pending') === '1' &&
          c.query.get('date_from') === '2026-09-01' &&
          c.query.get('exam_id') === '10',
      ),
    )
    .toBe(true);
  await page.getByRole('link', { name: 'Review', exact: true }).click();
  await page.getByRole('link', { name: 'All results', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Needs grading' })).toBeChecked();
  await expect(page.getByLabel('From date')).toHaveValue('2026-09-01');
  await page.screenshot({ path: '../docs/screenshots/results-student-list.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.getByRole('heading', { name: 'Primary practice' })).toBeVisible();
});

test('paid-course form opens centrally, keeps validation visible and submits in a modal', async ({
  page,
}) => {
  await setup(page, 'doctor');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/courses/course-6');
  const button = page.getByRole('button', { name: 'Submit payment', exact: true });
  await button.scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => scrollY);
  await button.click();
  const modal = page.getByRole('dialog', { name: 'Payment details' });
  await expect(modal).toBeVisible();
  const box = await modal.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(812);
  await modal.getByLabel('Transaction reference').fill('DUPLICATE');
  await modal.getByLabel('Payment date').fill('2026-01-01');
  await modal.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(modal.getByText(/already been used/)).toBeVisible();
  await modal.getByLabel('Transaction reference').fill('VALID-REFERENCE');
  await page.screenshot({ path: '../docs/screenshots/payment-modal-mobile.png' });
  await modal.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByText('Your payment is awaiting approval.')).toBeVisible();
  expect(Math.abs((await page.evaluate(() => scrollY)) - scroll)).toBeLessThan(160);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('course colours stay distinct after sorting and respect reduced motion', async ({ page }) => {
  await setup(page, 'doctor');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/courses');
  await expect(page.locator('.course-card')).toHaveCount(6);
  const colourMap = () =>
    page
      .locator('.course-card')
      .evaluateAll((cards) =>
        Object.fromEntries(
          cards.map((c) => [
            c.querySelector('h3').textContent,
            getComputedStyle(c).getPropertyValue('--course-accent'),
          ]),
        ),
      );
  const before = await colourMap();
  expect(new Set(Object.values(before)).size).toBe(6);
  await page.getByLabel('Sort courses').selectOption('oldest');
  await expect(page.locator('.course-card').first()).toContainText('Course 1');
  expect(await colourMap()).toEqual(before);
  expect(
    await page
      .locator('.course-card')
      .first()
      .evaluate((c) => getComputedStyle(c).animationName),
  ).toBe('none');
  await page.screenshot({
    path: '../docs/screenshots/courses-distinct-colours.png',
    fullPage: true,
  });
  for (const width of [320, 760, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test('profile form opens in a modal and closes after saving', async ({ page }) => {
  await setup(page, 'doctor');
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Edit profile' }).click();
  const modal = page.getByRole('dialog', { name: 'Personal details' });
  await modal.getByLabel('Full name').fill('Dr Updated');
  await modal.getByRole('button', { name: 'Save changes' }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator('.profile-summary').first()).toContainText('Dr Updated');
});
