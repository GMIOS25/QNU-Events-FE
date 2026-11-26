import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EventFormPage } from '../features/events/EventFormPage';
import { ApiErrorException } from '../api/client';
import * as eventsApi from '../api/events';
import type { EventDetail, OrgClass } from '../features/events/types';

vi.mock('../api/events', () => ({
  fetchEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  fetchClasses: vi.fn(),
}));

const classes: OrgClass[] = [
  { id: 'cls-1', code: 'K49CNTT1', name: 'Công nghệ thông tin K49 A', facultyName: 'Công nghệ thông tin' },
  { id: 'cls-2', code: 'K49CNTT2', name: 'Công nghệ thông tin K49 B', facultyName: 'Công nghệ thông tin' },
];

const existingEvent: EventDetail = {
  id: 'evt-1',
  title: 'Hội thảo AI',
  description: 'Nội dung mô tả',
  location: 'Hội trường B',
  startAt: '2026-12-15T09:00:00Z',
  endAt: '2026-12-15T11:00:00Z',
  registrationDeadline: '2026-12-14T23:59:00Z',
  attendanceOpenAt: '2026-12-15T08:45:00Z',
  attendanceCloseAt: '2026-12-15T11:15:00Z',
  attendanceMethod: 'DYNAMIC_QR',
  qrRotationSeconds: 10,
  qrGraceSeconds: 3,
  quotaTotal: 50,
  registeredCount: 0,
  remainingQuota: 50,
  registrationOpen: false,
  attendanceOpen: false,
  status: 'DRAFT',
  activityType: 'Hội thảo khoa học',
  activityPoints: 5,
  ownerId: 'owner-1',
  audienceClassIds: ['cls-1'],
  version: 3,
};

function renderEditPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/events/evt-1/edit']}>
        <Routes>
          <Route path="/events/:id/edit" element={<EventFormPage />} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

async function openHydratedEditPage() {
  renderEditPage();
  expect(await screen.findByRole('heading', { name: 'Chỉnh sửa sự kiện' })).toBeInTheDocument();
  await screen.findByDisplayValue(existingEvent.title);
}

function clickSave() {
  fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));
}

describe('EventFormPage edit flow [QE-65]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(eventsApi.fetchEvent).mockResolvedValue(existingEvent);
    vi.mocked(eventsApi.fetchClasses).mockResolvedValue(classes);
    vi.mocked(eventsApi.updateEvent).mockResolvedValue({ ...existingEvent, version: 4 });
  });

  it('sends the loaded version when saving changes to an existing event', async () => {
    await openHydratedEditPage();

    clickSave();

    await waitFor(() => expect(eventsApi.updateEvent).toHaveBeenCalledTimes(1));
    expect(eventsApi.updateEvent).toHaveBeenCalledWith('evt-1', expect.objectContaining({ version: 3 }));
    expect(eventsApi.createEvent).not.toHaveBeenCalled();
  });

  it('asks to reload the page when the event was changed by someone else (VERSION_CONFLICT)', async () => {
    vi.mocked(eventsApi.updateEvent).mockRejectedValue(
      new ApiErrorException(409, { code: 'VERSION_CONFLICT', message: 'Phiên bản sự kiện không khớp.' })
    );
    await openHydratedEditPage();

    clickSave();

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Dữ liệu sự kiện đã bị thay đổi bởi người khác. Vui lòng tải lại trang và thử lại.');
    expect(banner).not.toHaveTextContent('Phiên bản sự kiện không khớp.');
  });

  it('shows the server error of the invalid field (details.fields)', async () => {
    vi.mocked(eventsApi.updateEvent).mockRejectedValue(
      new ApiErrorException(400, {
        code: 'VALIDATION_FAILED',
        message: 'Dữ liệu gửi lên không hợp lệ.',
        details: { fields: { endAt: 'Thời gian kết thúc phải sau thời gian bắt đầu.' } },
      })
    );
    await openHydratedEditPage();

    clickSave();

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Thời gian kết thúc phải sau thời gian bắt đầu.');
  });
});
