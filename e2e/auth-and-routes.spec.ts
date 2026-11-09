import { test, expect } from '@playwright/test';

test.describe('Authentication & Access Control', () => {
  test('redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/events');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h2')).toContainText(/QNU Events/i);
    await expect(page.locator('button[type="submit"]')).toContainText(/Đăng nhập/i);
  });

  test('displays login error on invalid credentials', async ({ page }) => {
    // Mock 401 error from backend
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'UNAUTHENTICATED',
          message: 'Tên đăng nhập hoặc mật khẩu không chính xác.',
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input[name="loginId"]', 'wrong_user');
    await page.fill('input[name="password"]', 'WrongPass123!');
    await page.click('button[type="submit"]');

    // Should display error banner
    await expect(page.locator('.bg-red-50')).toBeVisible();
    await expect(page.locator('.bg-red-50')).toContainText(/Tên đăng nhập hoặc mật khẩu không chính xác/i);
  });

  test('student cannot access owner event creation route', async ({ page }) => {
    // Mock auth/me and events
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-student-id',
          fullName: 'Sinh Viên Test',
          roles: ['STUDENT'],
          classId: 'k49-cntt1',
        }),
      });
    });

    await page.route('**/api/v1/events*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 20,
          number: 0,
        }),
      });
    });

    // Set up student auth in sessionStorage
    await page.addInitScript(() => {
      sessionStorage.setItem('qnu_events_access_token', 'mock_student_token');
      sessionStorage.setItem(
        'qnu_events_user_info',
        JSON.stringify({
          id: 'mock-student-id',
          fullName: 'Sinh Viên Test',
          roles: ['STUDENT'],
          classId: 'k49-cntt1',
        })
      );
    });

    await page.goto('/events/new');
    // Should be redirected to /events because STUDENT doesn't have EVENT_OWNER role
    await expect(page).toHaveURL(/.*events$/);
  });

  test('student can navigate to history page and view items', async ({ page }) => {
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-student-id',
          fullName: 'Sinh Viên Test',
          roles: ['STUDENT'],
          classId: 'k49-cntt1',
        }),
      });
    });

    await page.route('**/api/v1/me/history', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            eventId: 'evt-101',
            title: 'Hội thảo AI Đại học Quy Nhơn',
            startAt: '2026-11-15T09:00:00Z',
            location: 'Hội trường B',
            registrationStatus: 'REGISTERED',
            registeredAt: '2026-11-10T08:00:00Z',
            attendanceStatus: 'ACCEPTED',
            attendanceAt: '2026-11-15T09:10:00Z',
            method: 'DYNAMIC_QR',
            activityType: 'Hội thảo',
            activityPoints: 10,
          },
        ]),
      });
    });

    await page.addInitScript(() => {
      sessionStorage.setItem('qnu_events_access_token', 'mock_student_token');
      sessionStorage.setItem(
        'qnu_events_user_info',
        JSON.stringify({
          id: 'mock-student-id',
          fullName: 'Sinh Viên Test',
          roles: ['STUDENT'],
          classId: 'k49-cntt1',
        })
      );
    });

    await page.goto('/history');
    await expect(page.locator('h1')).toContainText(/Lịch sử sự kiện & Điểm rèn luyện/i);
    await expect(page.getByText('Hội thảo AI Đại học Quy Nhơn')).toBeVisible();
    await expect(page.getByText('Đã điểm danh').first()).toBeVisible();
    await expect(page.getByText('+10 điểm (Hội thảo)')).toBeVisible();
  });
});
