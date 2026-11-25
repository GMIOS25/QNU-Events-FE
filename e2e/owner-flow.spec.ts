import { test, expect } from '@playwright/test';

test.describe('Owner Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock owner auth/me
    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'owner-uuid-01',
          fullName: 'Trần Ban Tổ Chức',
          roles: ['EVENT_OWNER'],
          classId: null,
        }),
      });
    });

    // Mock classes for event creation
    await page.route('**/api/v1/classes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'cls-1',
            code: 'K49CNTT1',
            name: 'Kỹ thuật Phần mềm K49',
            faculty: 'CNTT',
            cohort: 'K49',
          },
        ]),
      });
    });

    // Seed session storage
    await page.addInitScript(() => {
      sessionStorage.setItem('qnu_events_access_token', 'mock_owner_token');
      sessionStorage.setItem(
        'qnu_events_user_info',
        JSON.stringify({
          id: 'owner-uuid-01',
          fullName: 'Trần Ban Tổ Chức',
          roles: ['EVENT_OWNER'],
          classId: null,
        })
      );
    });
  });

  test('owner sees management header and creation button', async ({ page }) => {
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

    await page.goto('/events');
    await expect(page.locator('h1')).toContainText(/Quản lý sự kiện đơn vị/i);
    await expect(page.getByRole('button', { name: /Tạo sự kiện mới/i })).toBeVisible();
  });

  test('owner can open event creation form and see class selector', async ({ page }) => {
    await page.goto('/events/new');
    await expect(page.locator('h1')).toContainText(/Tạo sự kiện mới/i);
    await expect(page.getByText('K49CNTT1')).toBeVisible();
    await expect(page.getByRole('button', { name: /Tạo bản nháp sự kiện/i })).toBeVisible();
  });

  test('owner can view QR code presentation page', async ({ page }) => {
    await page.route('**/api/v1/events/evt-999', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'evt-999',
          title: 'Ngày hội Việc làm QNU 2026',
          location: 'Hội trường A',
          startAt: '2026-11-15T08:00:00Z',
          endAt: '2026-11-15T12:00:00Z',
          attendanceOpenAt: '2026-11-15T07:45:00Z',
          attendanceCloseAt: '2026-11-15T12:15:00Z',
          status: 'PUBLISHED',
          attendanceOpen: true,
          registeredCount: 45,
          quotaTotal: 100,
        }),
      });
    });

    await page.route('**/api/v1/events/evt-999/qr', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'qr1.evt-999.12345.mock_signature',
          epoch: 12345,
          validUntil: '2026-11-15T08:00:10Z',
          rotationSeconds: 10,
          serverTime: '2026-11-15T08:00:00Z',
        }),
      });
    });

    await page.goto('/events/evt-999/qr');
    await expect(page.locator('h1')).toContainText(/Ngày hội Việc làm QNU 2026/i);
    await expect(page.getByText(/Epoch #12345/i)).toBeVisible();
    await expect(page.getByText(/qr1.evt-999.12345.mock_signature/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Chép mã/i })).toBeVisible();
  });
});

